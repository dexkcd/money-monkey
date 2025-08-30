"""
Unit tests for ExpenseService
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from decimal import Decimal
from datetime import date, datetime
from fastapi import HTTPException, UploadFile
from io import BytesIO

from app.services.expense import ExpenseService
from app.models.expense import Expense
from app.models.category import Category
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from tests.helpers import create_test_user, create_test_category, create_test_expense


class TestExpenseService:
    
    @pytest.fixture
    def expense_service(self):
        return ExpenseService()
    
    @pytest.fixture
    def sample_expense_data(self):
        return {
            "amount": Decimal("25.50"),
            "description": "Test expense",
            "expense_date": date.today(),
            "category_id": 1
        }
    
    def test_get_expenses_basic(self, db_session, expense_service):
        """Test basic expense retrieval"""
        from app.models.user import User
        from app.models.category import Category
        from app.models.expense import Expense
        from app.core.security import get_password_hash
        
        # Create user manually
        user = User(
            email="test@example.com",
            password_hash=get_password_hash("testpassword123")
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        # Create category manually
        category = Category(
            name="Test Category",
            color="#FF0000",
            is_default=False
        )
        db_session.add(category)
        db_session.commit()
        db_session.refresh(category)
        
        # Create expense manually
        expense = Expense(
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("25.50"),
            description="Test expense",
            expense_date=date.today()
        )
        db_session.add(expense)
        db_session.commit()
        db_session.refresh(expense)
        
        expenses = expense_service.get_expenses(db_session, user.id)
        
        assert len(expenses) == 1
        assert expenses[0].id == expense.id
        assert expenses[0].user_id == user.id
    
    def test_get_expenses_with_filters(self, db_session, expense_service):
        """Test expense retrieval with filters"""
        user = create_test_user(db_session)
        category1 = create_test_category(db_session, name="Food")
        category2 = create_test_category(db_session, name="Transport")
        
        # Create expenses with different categories and amounts
        expense1 = create_test_expense(
            db_session, user.id, category1.id, amount=Decimal("20.00")
        )
        expense2 = create_test_expense(
            db_session, user.id, category2.id, amount=Decimal("50.00")
        )
        
        # Test category filter
        expenses = expense_service.get_expenses(
            db_session, user.id, category_id=category1.id
        )
        assert len(expenses) == 1
        assert expenses[0].id == expense1.id
        
        # Test amount filter
        expenses = expense_service.get_expenses(
            db_session, user.id, min_amount=30.0
        )
        assert len(expenses) == 1
        assert expenses[0].id == expense2.id
    
    def test_get_expenses_with_search(self, db_session, expense_service):
        """Test expense search functionality"""
        user = create_test_user(db_session)
        category = create_test_category(db_session, name="Restaurant")
        
        expense1 = create_test_expense(
            db_session, user.id, category.id, description="Pizza dinner"
        )
        expense2 = create_test_expense(
            db_session, user.id, category.id, description="Coffee shop"
        )
        
        # Search by description
        expenses = expense_service.get_expenses(
            db_session, user.id, search="pizza"
        )
        assert len(expenses) == 1
        assert expenses[0].id == expense1.id
        
        # Search by category name
        expenses = expense_service.get_expenses(
            db_session, user.id, search="restaurant"
        )
        assert len(expenses) == 2  # Both expenses have Restaurant category
    
    def test_get_expense_by_id(self, db_session, expense_service):
        """Test getting specific expense by ID"""
        user = create_test_user(db_session)
        category = create_test_category(db_session)
        expense = create_test_expense(db_session, user.id, category.id)
        
        result = expense_service.get_expense(db_session, expense.id, user.id)
        
        assert result is not None
        assert result.id == expense.id
        assert result.user_id == user.id
    
    def test_get_expense_wrong_user(self, db_session, expense_service):
        """Test getting expense with wrong user ID returns None"""
        user1 = create_test_user(db_session, email="user1@example.com")
        user2 = create_test_user(db_session, email="user2@example.com")
        category = create_test_category(db_session)
        expense = create_test_expense(db_session, user1.id, category.id)
        
        result = expense_service.get_expense(db_session, expense.id, user2.id)
        
        assert result is None
    
    def test_create_expense_basic(self, db_session, expense_service, sample_expense_data):
        """Test basic expense creation"""
        user = create_test_user(db_session)
        category = create_test_category(db_session, is_default=True)  # Make it a default category
        
        expense_data = ExpenseCreate(
            amount=sample_expense_data["amount"],
            description=sample_expense_data["description"],
            expense_date=sample_expense_data["expense_date"],
            category_id=category.id
        )
        
        with patch.object(expense_service, '_check_budget_alerts_after_expense'):
            result = expense_service.create_expense(db_session, expense_data, user.id)
        
        assert result.user_id == user.id
        assert result.amount == sample_expense_data["amount"]
        assert result.description == sample_expense_data["description"]
        assert result.category_id == category.id
        assert result.ai_confidence is None
    
    def test_create_expense_with_auto_categorize(self, db_session, expense_service):
        """Test expense creation with AI categorization"""
        user = create_test_user(db_session)
        category = create_test_category(db_session, name="Restaurants", is_default=True)
        
        expense_data = ExpenseCreate(
            amount=Decimal("25.50"),
            description="Pizza dinner",
            expense_date=date.today(),
            category_id=category.id
        )
        
        # Mock OpenAI service
        mock_openai = Mock()
        mock_openai.categorize_expense.return_value = "Restaurants"
        expense_service.openai_service = mock_openai
        
        with patch.object(expense_service, '_check_budget_alerts_after_expense'):
            result = expense_service.create_expense(
                db_session, expense_data, user.id, auto_categorize=True
            )
        
        assert result.category_id == category.id
        assert result.ai_confidence == Decimal("0.8")
        mock_openai.categorize_expense.assert_called_once_with(
            "Pizza dinner", Decimal("25.50")
        )
    
    def test_create_expense_invalid_category(self, db_session, expense_service):
        """Test expense creation with invalid category raises error"""
        user = create_test_user(db_session)
        
        expense_data = ExpenseCreate(
            amount=Decimal("25.50"),
            description="Test expense",
            expense_date=date.today(),
            category_id=999  # Non-existent category
        )
        
        with pytest.raises(HTTPException) as exc_info:
            expense_service.create_expense(db_session, expense_data, user.id)
        
        assert exc_info.value.status_code == 400
        assert "Invalid category" in str(exc_info.value.detail)
    
    def test_suggest_category_with_openai(self, expense_service):
        """Test category suggestion with OpenAI service"""
        mock_openai = Mock()
        mock_openai.categorize_expense.return_value = "Restaurants"
        expense_service.openai_service = mock_openai
        
        result = expense_service.suggest_category("Pizza dinner", 25.50)
        
        assert result == "Restaurants"
        mock_openai.categorize_expense.assert_called_once_with(
            "Pizza dinner", Decimal("25.50")
        )
    
    def test_suggest_category_without_openai(self, expense_service):
        """Test category suggestion without OpenAI service"""
        expense_service.openai_service = None
        
        result = expense_service.suggest_category("Pizza dinner", 25.50)
        
        assert result == "Other"
    
    def test_get_expense_stats(self, db_session, expense_service):
        """Test expense statistics calculation"""
        user = create_test_user(db_session)
        category1 = create_test_category(db_session, name="Food")
        category2 = create_test_category(db_session, name="Transport")
        
        # Create expenses
        create_test_expense(db_session, user.id, category1.id, amount=Decimal("20.00"))
        create_test_expense(db_session, user.id, category1.id, amount=Decimal("30.00"))
        create_test_expense(db_session, user.id, category2.id, amount=Decimal("50.00"))
        
        stats = expense_service.get_expense_stats(db_session, user.id)
        
        assert stats["total_amount"] == 100.0
        assert stats["total_count"] == 3
        assert stats["average_amount"] == 100.0 / 3
        assert len(stats["by_category"]) == 2
        
        # Check category breakdown
        food_stats = next(cat for cat in stats["by_category"] if cat["category"] == "Food")
        assert food_stats["amount"] == 50.0
        assert food_stats["count"] == 2
        assert food_stats["percentage"] == 50.0
    
    def test_update_expense(self, db_session, expense_service):
        """Test expense update"""
        user = create_test_user(db_session)
        category = create_test_category(db_session)
        expense = create_test_expense(db_session, user.id, category.id)
        
        update_data = ExpenseUpdate(
            amount=Decimal("35.00"),
            description="Updated expense"
        )
        
        result = expense_service.update_expense(
            db_session, expense.id, update_data, user.id
        )
        
        assert result is not None
        assert result.amount == Decimal("35.00")
        assert result.description == "Updated expense"
    
    def test_update_expense_not_found(self, db_session, expense_service):
        """Test updating non-existent expense returns None"""
        user = create_test_user(db_session)
        
        update_data = ExpenseUpdate(amount=Decimal("35.00"))
        
        result = expense_service.update_expense(
            db_session, 999, update_data, user.id
        )
        
        assert result is None
    
    def test_delete_expense(self, db_session, expense_service):
        """Test expense deletion"""
        user = create_test_user(db_session)
        category = create_test_category(db_session)
        expense = create_test_expense(db_session, user.id, category.id)
        
        result = expense_service.delete_expense(db_session, expense.id, user.id)
        
        assert result is True
        
        # Verify expense is deleted
        deleted_expense = db_session.query(Expense).filter(
            Expense.id == expense.id
        ).first()
        assert deleted_expense is None
    
    def test_delete_expense_not_found(self, db_session, expense_service):
        """Test deleting non-existent expense returns False"""
        user = create_test_user(db_session)
        
        result = expense_service.delete_expense(db_session, 999, user.id)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_upload_receipt(self, db_session, expense_service):
        """Test receipt upload functionality"""
        user = create_test_user(db_session)
        
        # Mock file upload
        file_content = b"fake image content"
        file = Mock(spec=UploadFile)
        file.filename = "receipt.jpg"
        file.file = BytesIO(file_content)
        file.content_type = "image/jpeg"
        
        # Mock file service
        mock_file_service = Mock()
        mock_file_service.save_file = AsyncMock(return_value=("receipt.jpg", "/path/to/receipt.jpg", 1024))
        mock_file_service.get_file_url.return_value = "http://example.com/receipt.jpg"
        expense_service.file_service = mock_file_service
        
        # Mock OpenAI service
        from app.schemas.expense import ReceiptProcessingResult
        mock_openai = Mock()
        mock_openai.extract_receipt_data.return_value = ReceiptProcessingResult(
            raw_text="Test receipt text",
            extracted_amount=Decimal("25.50"),
            extracted_date=date.today(),
            extracted_merchant="Test Restaurant",
            suggested_category="Restaurants",
            confidence_score=0.95
        )
        expense_service.openai_service = mock_openai
        
        result = await expense_service.upload_receipt(db_session, file, user.id)
        
        assert result.filename == "receipt.jpg"
        assert result.file_url == "http://example.com/receipt.jpg"
        assert result.processing_result is not None
        assert result.processing_result.extracted_amount == Decimal("25.50")
    
    def test_create_expense_from_receipt(self, db_session, expense_service):
        """Test creating expense from receipt processing result"""
        user = create_test_user(db_session)
        category = create_test_category(db_session, name="Restaurants", is_default=True)
        
        processing_result = {
            "extracted_amount": 25.50,
            "extracted_date": date.today(),
            "extracted_merchant": "Test Restaurant",
            "suggested_category": "Restaurants",
            "confidence_score": 0.95
        }
        
        with patch.object(expense_service, '_check_budget_alerts_after_expense'):
            result = expense_service.create_expense_from_receipt(
                db_session, user.id, "http://example.com/receipt.jpg", processing_result
            )
        
        assert result.user_id == user.id
        assert result.amount == Decimal("25.50")
        assert result.description == "Test Restaurant"
        assert result.category_id == category.id
        assert result.receipt_url == "http://example.com/receipt.jpg"
        assert result.ai_confidence == Decimal("0.95")
    
    def test_create_expense_from_receipt_invalid_amount(self, db_session, expense_service):
        """Test creating expense from receipt with invalid amount"""
        user = create_test_user(db_session)
        
        processing_result = {
            "extracted_amount": 0,  # Invalid amount
            "suggested_category": "Restaurants"
        }
        
        with pytest.raises(HTTPException) as exc_info:
            expense_service.create_expense_from_receipt(
                db_session, user.id, "http://example.com/receipt.jpg", processing_result
            )
        
        assert exc_info.value.status_code == 400
        assert "Invalid or missing amount" in str(exc_info.value.detail)