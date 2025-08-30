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
from tests.factories import UserFactory, CategoryFactory, ExpenseFactory


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
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        expense = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id
        )
        
        expenses = expense_service.get_expenses(db_session, user.id)
        
        assert len(expenses) == 1
        assert expenses[0].id == expense.id
        assert expenses[0].user_id == user.id
    
    def test_get_expenses_with_filters(self, db_session, expense_service):
        """Test expense retrieval with filters"""
        user = UserFactory(sqlalchemy_session=db_session)
        category1 = CategoryFactory(sqlalchemy_session=db_session, name="Food")
        category2 = CategoryFactory(sqlalchemy_session=db_session, name="Transport")
        
        # Create expenses with different categories and amounts
        expense1 = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category1.id,
            amount=Decimal("20.00")
        )
        expense2 = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category2.id,
            amount=Decimal("50.00")
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
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session, name="Restaurant")
        
        expense1 = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            description="Pizza dinner"
        )
        expense2 = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            description="Coffee shop"
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
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        expense = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id
        )
        
        result = expense_service.get_expense(db_session, expense.id, user.id)
        
        assert result is not None
        assert result.id == expense.id
        assert result.user_id == user.id
    
    def test_get_expense_wrong_user(self, db_session, expense_service):
        """Test getting expense with wrong user ID returns None"""
        user1 = UserFactory(sqlalchemy_session=db_session)
        user2 = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        expense = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user1.id,
            category_id=category.id
        )
        
        result = expense_service.get_expense(db_session, expense.id, user2.id)
        
        assert result is None
    
    def test_create_expense_basic(self, db_session, expense_service, sample_expense_data):
        """Test basic expense creation"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        
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
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session, name="Restaurants")
        
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
        assert result.ai_confidence == 0.8
        mock_openai.categorize_expense.assert_called_once_with(
            "Pizza dinner", Decimal("25.50")
        )
    
    def test_create_expense_invalid_category(self, db_session, expense_service):
        """Test expense creation with invalid category raises error"""
        user = UserFactory(sqlalchemy_session=db_session)
        
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
        user = UserFactory(sqlalchemy_session=db_session)
        category1 = CategoryFactory(sqlalchemy_session=db_session, name="Food")
        category2 = CategoryFactory(sqlalchemy_session=db_session, name="Transport")
        
        # Create expenses
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category1.id,
            amount=Decimal("20.00")
        )
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category1.id,
            amount=Decimal("30.00")
        )
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category2.id,
            amount=Decimal("50.00")
        )
        
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
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        expense = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id
        )
        
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
        user = UserFactory(sqlalchemy_session=db_session)
        
        update_data = ExpenseUpdate(amount=Decimal("35.00"))
        
        result = expense_service.update_expense(
            db_session, 999, update_data, user.id
        )
        
        assert result is None
    
    def test_delete_expense(self, db_session, expense_service):
        """Test expense deletion"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        expense = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id
        )
        
        result = expense_service.delete_expense(db_session, expense.id, user.id)
        
        assert result is True
        
        # Verify expense is deleted
        deleted_expense = db_session.query(Expense).filter(
            Expense.id == expense.id
        ).first()
        assert deleted_expense is None
    
    def test_delete_expense_not_found(self, db_session, expense_service):
        """Test deleting non-existent expense returns False"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        result = expense_service.delete_expense(db_session, 999, user.id)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_upload_receipt(self, db_session, expense_service):
        """Test receipt upload functionality"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        # Mock file upload
        file_content = b"fake image content"
        file = UploadFile(
            filename="receipt.jpg",
            file=BytesIO(file_content),
            content_type="image/jpeg"
        )
        
        # Mock file service
        mock_file_service = Mock()
        mock_file_service.save_file = AsyncMock(return_value=("receipt.jpg", "/path/to/receipt.jpg", 1024))
        mock_file_service.get_file_url.return_value = "http://example.com/receipt.jpg"
        expense_service.file_service = mock_file_service
        
        # Mock OpenAI service
        mock_openai = Mock()
        mock_openai.extract_receipt_data.return_value = {
            "extracted_amount": 25.50,
            "extracted_date": date.today(),
            "suggested_category": "Restaurants"
        }
        expense_service.openai_service = mock_openai
        
        result = await expense_service.upload_receipt(db_session, file, user.id)
        
        assert result.filename == "receipt.jpg"
        assert result.file_url == "http://example.com/receipt.jpg"
        assert result.processing_result is not None
        assert result.processing_result["extracted_amount"] == 25.50
    
    def test_create_expense_from_receipt(self, db_session, expense_service):
        """Test creating expense from receipt processing result"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session, name="Restaurants")
        
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
        assert result.ai_confidence == 0.95
    
    def test_create_expense_from_receipt_invalid_amount(self, db_session, expense_service):
        """Test creating expense from receipt with invalid amount"""
        user = UserFactory(sqlalchemy_session=db_session)
        
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