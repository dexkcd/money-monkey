"""
Integration tests for budget API endpoints
"""
import pytest
from decimal import Decimal
from datetime import date, timedelta
from fastapi.testclient import TestClient

from tests.factories import UserFactory, CategoryFactory, BudgetFactory, ExpenseFactory


class TestBudgetAPI:
    
    def test_get_budgets(self, authenticated_client, test_user, default_categories):
        """Test getting budgets list"""
        category = default_categories[0]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("500.00")
        )
        
        response = authenticated_client.get("/api/v1/budgets/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["amount"] == "500.00"
        assert data[0]["category_id"] == category.id
    
    def test_get_budgets_with_spending(self, authenticated_client, test_user, default_categories):
        """Test getting budgets with spending calculations"""
        category = default_categories[0]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        today = date.today()
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("100.00"),
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=5)
        )
        
        # Create expense within budget period
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("40.00"),
            expense_date=today
        )
        
        response = authenticated_client.get("/api/v1/budgets/with-spending")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["current_spending"] == "40.00"
        assert data[0]["remaining_amount"] == "60.00"
        assert data[0]["percentage_used"] == 40.0
    
    def test_create_budget(self, authenticated_client, test_user, default_categories):
        """Test creating a new budget"""
        category = default_categories[0]
        
        budget_data = {
            "category_id": category.id,
            "amount": "500.00",
            "period_type": "MONTHLY",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        
        response = authenticated_client.post("/api/v1/budgets/", json=budget_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["amount"] == "500.00"
        assert data["category_id"] == category.id
        assert data["period_type"] == "MONTHLY"
        assert data["user_id"] == test_user.id
    
    def test_create_budget_invalid_category(self, authenticated_client, test_user):
        """Test creating budget with invalid category"""
        budget_data = {
            "category_id": 999,  # Non-existent category
            "amount": "500.00",
            "period_type": "MONTHLY",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        
        response = authenticated_client.post("/api/v1/budgets/", json=budget_data)
        
        assert response.status_code == 400
        assert "Category not found" in response.json()["detail"]
    
    def test_create_budget_overlapping_period(self, authenticated_client, test_user, default_categories):
        """Test creating budget with overlapping period"""
        category = default_categories[0]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        # Create existing budget
        existing_budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            period_type="MONTHLY",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        # Try to create overlapping budget
        budget_data = {
            "category_id": category.id,
            "amount": "600.00",
            "period_type": "MONTHLY",
            "start_date": "2024-01-15",  # Overlaps with existing
            "end_date": "2024-02-15"
        }
        
        response = authenticated_client.post("/api/v1/budgets/", json=budget_data)
        
        assert response.status_code == 400
        assert "Budget already exists" in response.json()["detail"]
    
    def test_get_budget_by_id(self, authenticated_client, test_user, default_categories):
        """Test getting specific budget by ID"""
        category = default_categories[0]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("500.00")
        )
        
        response = authenticated_client.get(f"/api/v1/budgets/{budget.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == budget.id
        assert data["amount"] == "500.00"
    
    def test_get_budget_not_found(self, authenticated_client):
        """Test getting non-existent budget returns 404"""
        response = authenticated_client.get("/api/v1/budgets/999")
        
        assert response.status_code == 404
    
    def test_update_budget(self, authenticated_client, test_user, default_categories):
        """Test updating a budget"""
        category = default_categories[0]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("500.00")
        )
        
        update_data = {
            "amount": "600.00"
        }
        
        response = authenticated_client.put(f"/api/v1/budgets/{budget.id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == "600.00"
    
    def test_update_budget_not_found(self, authenticated_client):
        """Test updating non-existent budget returns 404"""
        update_data = {"amount": "600.00"}
        
        response = authenticated_client.put("/api/v1/budgets/999", json=update_data)
        
        assert response.status_code == 404
    
    def test_delete_budget(self, authenticated_client, test_user, default_categories):
        """Test deleting a budget"""
        category = default_categories[0]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id
        )
        
        response = authenticated_client.delete(f"/api/v1/budgets/{budget.id}")
        
        assert response.status_code == 204
        
        # Verify budget is deleted
        get_response = authenticated_client.get(f"/api/v1/budgets/{budget.id}")
        assert get_response.status_code == 404
    
    def test_delete_budget_not_found(self, authenticated_client):
        """Test deleting non-existent budget returns 404"""
        response = authenticated_client.delete("/api/v1/budgets/999")
        
        assert response.status_code == 404
    
    def test_get_budget_summary(self, authenticated_client, test_user, default_categories):
        """Test getting budget summary"""
        category1 = default_categories[0]
        category2 = default_categories[1]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        today = date.today()
        
        # Create active budgets
        budget1 = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category1.id,
            amount=Decimal("100.00"),
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=5)
        )
        budget2 = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category2.id,
            amount=Decimal("200.00"),
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=5)
        )
        
        # Create expenses
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category1.id,
            amount=Decimal("120.00"),  # Over budget
            expense_date=today
        )
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category2.id,
            amount=Decimal("170.00"),  # Near limit
            expense_date=today
        )
        
        response = authenticated_client.get("/api/v1/budgets/summary")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_budgets"] == 2
        assert data["total_budget_amount"] == "300.00"
        assert data["total_spending"] == "290.00"
        assert data["budgets_over_limit"] == 1
        assert data["budgets_near_limit"] == 2
    
    def test_get_spending_aggregation(self, authenticated_client, test_user, default_categories):
        """Test getting spending aggregation"""
        category = default_categories[0]
        db_session = authenticated_client.app.dependency_overrides[lambda: None].__wrapped__()
        
        today = date.today()
        month_start = today.replace(day=1)
        if today.month == 12:
            month_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        # Create budget for current month
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("200.00"),
            start_date=month_start,
            end_date=month_end
        )
        
        # Create expense
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=test_user.id,
            category_id=category.id,
            amount=Decimal("150.00"),
            expense_date=today
        )
        
        response = authenticated_client.get("/api/v1/budgets/spending-aggregation")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["total_spending"] == "150.00"
        assert data[0]["budget_amount"] == "200.00"
        assert data[0]["percentage_used"] == 75.0
        assert data[0]["is_over_budget"] is False
        assert data[0]["is_near_limit"] is False
    
    def test_unauthorized_access(self, client):
        """Test that endpoints require authentication"""
        response = client.get("/api/v1/budgets/")
        assert response.status_code == 401
        
        response = client.post("/api/v1/budgets/", json={})
        assert response.status_code == 401