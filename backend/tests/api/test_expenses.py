"""
Integration tests for expense API endpoints
"""
import pytest
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient
import json

from tests.factories import UserFactory, CategoryFactory, ExpenseFactory


class TestExpenseAPI:
    
    def test_get_expenses(self, authenticated_client, test_user, default_categories):
        """Test getting expenses list"""
        category = default_categories[0]
        
        # Create test expenses
        ExpenseFactory(
            sqlalchemy_session=authenticated_client.app.dependency_overrides[lambda: None].__wrapped__(),
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("25.50"),
            description="Test expense"
        )
        
        response = authenticated_client.get("/api/v1/expenses/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["amount"] == "25.50"
        assert data[0]["description"] == "Test expense"
    
    def test_get_expenses_with_filters(self, authenticated_client, test_user, default_categories):
        """Test getting expenses with query filters"""
        category1 = default_categories[0]
        category2 = default_categories[1]
        
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        # Create expenses with different categories
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category1.id,
            amount=Decimal("25.50")
        )
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category2.id,
            amount=Decimal("50.00")
        )
        
        # Filter by category
        response = authenticated_client.get(f"/api/v1/expenses/?category_id={category1.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["amount"] == "25.50"
        
        # Filter by minimum amount
        response = authenticated_client.get("/api/v1/expenses/?min_amount=30")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["amount"] == "50.00"
    
    def test_create_expense(self, authenticated_client, test_user, default_categories):
        """Test creating a new expense"""
        category = default_categories[0]
        
        expense_data = {
            "amount": "25.50",
            "description": "Test expense",
            "category_id": category.id,
            "expense_date": "2024-01-15"
        }
        
        response = authenticated_client.post("/api/v1/expenses/", json=expense_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["amount"] == "25.50"
        assert data["description"] == "Test expense"
        assert data["category_id"] == category.id
        assert data["user_id"] == test_user.id
    
    def test_create_expense_invalid_category(self, authenticated_client, test_user):
        """Test creating expense with invalid category"""
        expense_data = {
            "amount": "25.50",
            "description": "Test expense",
            "category_id": 999,  # Non-existent category
            "expense_date": "2024-01-15"
        }
        
        response = authenticated_client.post("/api/v1/expenses/", json=expense_data)
        
        assert response.status_code == 400
        assert "Invalid category" in response.json()["detail"]
    
    def test_create_expense_with_auto_categorize(self, authenticated_client, test_user, default_categories):
        """Test creating expense with auto-categorization"""
        category = default_categories[0]  # Will be overridden by AI
        
        expense_data = {
            "amount": "25.50",
            "description": "Pizza dinner",
            "category_id": category.id,
            "expense_date": "2024-01-15"
        }
        
        # Mock the expense service's OpenAI integration
        with pytest.mock.patch('app.services.expense.ExpenseService.create_expense') as mock_create:
            mock_expense = ExpenseFactory.build(
                user_id=test_user.id,
                category_id=category.id,
                amount=Decimal("25.50"),
                description="Pizza dinner",
                ai_confidence=0.8
            )
            mock_create.return_value = mock_expense
            
            response = authenticated_client.post(
                "/api/v1/expenses/?auto_categorize=true", 
                json=expense_data
            )
        
        assert response.status_code == 201
        mock_create.assert_called_once()
    
    def test_get_expense_by_id(self, authenticated_client, test_user, default_categories):
        """Test getting specific expense by ID"""
        category = default_categories[0]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        expense = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("25.50")
        )
        
        response = authenticated_client.get(f"/api/v1/expenses/{expense.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == expense.id
        assert data["amount"] == "25.50"
    
    def test_get_expense_not_found(self, authenticated_client):
        """Test getting non-existent expense returns 404"""
        response = authenticated_client.get("/api/v1/expenses/999")
        
        assert response.status_code == 404
    
    def test_update_expense(self, authenticated_client, test_user, default_categories):
        """Test updating an expense"""
        category = default_categories[0]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        expense = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("25.50")
        )
        
        update_data = {
            "amount": "35.00",
            "description": "Updated expense"
        }
        
        response = authenticated_client.put(f"/api/v1/expenses/{expense.id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == "35.00"
        assert data["description"] == "Updated expense"
    
    def test_update_expense_not_found(self, authenticated_client):
        """Test updating non-existent expense returns 404"""
        update_data = {"amount": "35.00"}
        
        response = authenticated_client.put("/api/v1/expenses/999", json=update_data)
        
        assert response.status_code == 404
    
    def test_delete_expense(self, authenticated_client, test_user, default_categories):
        """Test deleting an expense"""
        category = default_categories[0]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        expense = ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id
        )
        
        response = authenticated_client.delete(f"/api/v1/expenses/{expense.id}")
        
        assert response.status_code == 204
        
        # Verify expense is deleted
        get_response = authenticated_client.get(f"/api/v1/expenses/{expense.id}")
        assert get_response.status_code == 404
    
    def test_delete_expense_not_found(self, authenticated_client):
        """Test deleting non-existent expense returns 404"""
        response = authenticated_client.delete("/api/v1/expenses/999")
        
        assert response.status_code == 404
    
    def test_get_expense_stats(self, authenticated_client, test_user, default_categories):
        """Test getting expense statistics"""
        category = default_categories[0]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        # Create test expenses
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("25.50")
        )
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("30.00")
        )
        
        response = authenticated_client.get("/api/v1/expenses/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_amount"] == 55.5
        assert data["total_count"] == 2
        assert data["average_amount"] == 27.75
        assert len(data["by_category"]) == 1
    
    def test_suggest_category(self, authenticated_client):
        """Test expense category suggestion"""
        with pytest.mock.patch('app.services.expense.ExpenseService.suggest_category') as mock_suggest:
            mock_suggest.return_value = "Restaurants"
            
            response = authenticated_client.post(
                "/api/v1/expenses/suggest-category",
                json={"description": "Pizza dinner", "amount": 25.50}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["suggested_category"] == "Restaurants"
        mock_suggest.assert_called_once_with("Pizza dinner", 25.50)
    
    def test_unauthorized_access(self, client):
        """Test that endpoints require authentication"""
        response = client.get("/api/v1/expenses/")
        assert response.status_code == 401
        
        response = client.post("/api/v1/expenses/", json={})
        assert response.status_code == 401