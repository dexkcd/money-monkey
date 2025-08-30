"""
Unit tests for BudgetService
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import Mock

from app.services.budget import BudgetService
from app.models.budget import Budget
from app.models.expense import Expense
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetPeriod
from tests.factories import UserFactory, CategoryFactory, BudgetFactory, ExpenseFactory


class TestBudgetService:
    
    @pytest.fixture
    def budget_service(self, db_session):
        return BudgetService(db_session)
    
    def test_create_budget(self, db_session, budget_service):
        """Test basic budget creation"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        
        budget_data = BudgetCreate(
            category_id=category.id,
            amount=Decimal("500.00"),
            period_type=BudgetPeriod.MONTHLY,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        result = budget_service.create_budget(budget_data, user.id)
        
        assert result.user_id == user.id
        assert result.category_id == category.id
        assert result.amount == Decimal("500.00")
        assert result.period_type == "MONTHLY"
        assert result.start_date == date(2024, 1, 1)
        assert result.end_date == date(2024, 1, 31)
    
    def test_create_budget_invalid_category(self, db_session, budget_service):
        """Test budget creation with invalid category raises error"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        budget_data = BudgetCreate(
            category_id=999,  # Non-existent category
            amount=Decimal("500.00"),
            period_type=BudgetPeriod.MONTHLY,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        with pytest.raises(ValueError) as exc_info:
            budget_service.create_budget(budget_data, user.id)
        
        assert "Category not found" in str(exc_info.value)
    
    def test_create_budget_overlapping_period(self, db_session, budget_service):
        """Test budget creation with overlapping period raises error"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        
        # Create first budget
        existing_budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            period_type="MONTHLY",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        # Try to create overlapping budget
        budget_data = BudgetCreate(
            category_id=category.id,
            amount=Decimal("600.00"),
            period_type=BudgetPeriod.MONTHLY,
            start_date=date(2024, 1, 15),  # Overlaps with existing
            end_date=date(2024, 2, 15)
        )
        
        with pytest.raises(ValueError) as exc_info:
            budget_service.create_budget(budget_data, user.id)
        
        assert "Budget already exists" in str(exc_info.value)
    
    def test_get_budget(self, db_session, budget_service):
        """Test getting specific budget by ID"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id
        )
        
        result = budget_service.get_budget(budget.id, user.id)
        
        assert result is not None
        assert result.id == budget.id
        assert result.user_id == user.id
    
    def test_get_budget_wrong_user(self, db_session, budget_service):
        """Test getting budget with wrong user ID returns None"""
        user1 = UserFactory(sqlalchemy_session=db_session)
        user2 = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user1.id,
            category_id=category.id
        )
        
        result = budget_service.get_budget(budget.id, user2.id)
        
        assert result is None
    
    def test_get_budgets_with_filters(self, db_session, budget_service):
        """Test getting budgets with various filters"""
        user = UserFactory(sqlalchemy_session=db_session)
        category1 = CategoryFactory(sqlalchemy_session=db_session)
        category2 = CategoryFactory(sqlalchemy_session=db_session)
        
        # Create budgets with different categories and periods
        budget1 = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category1.id,
            period_type="MONTHLY"
        )
        budget2 = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category2.id,
            period_type="WEEKLY"
        )
        
        # Test category filter
        budgets = budget_service.get_budgets(user.id, category_id=category1.id)
        assert len(budgets) == 1
        assert budgets[0].id == budget1.id
        
        # Test period type filter
        budgets = budget_service.get_budgets(user.id, period_type=BudgetPeriod.WEEKLY)
        assert len(budgets) == 1
        assert budgets[0].id == budget2.id
    
    def test_get_budgets_active_only(self, db_session, budget_service):
        """Test getting only active budgets"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        
        today = date.today()
        
        # Create active budget
        active_budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=5)
        )
        
        # Create inactive budget (past)
        inactive_budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            start_date=today - timedelta(days=30),
            end_date=today - timedelta(days=10)
        )
        
        budgets = budget_service.get_budgets(user.id, active_only=True)
        
        assert len(budgets) == 1
        assert budgets[0].id == active_budget.id
    
    def test_update_budget(self, db_session, budget_service):
        """Test budget update"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("500.00")
        )
        
        update_data = BudgetUpdate(amount=Decimal("600.00"))
        
        result = budget_service.update_budget(budget.id, update_data, user.id)
        
        assert result is not None
        assert result.amount == Decimal("600.00")
    
    def test_update_budget_not_found(self, db_session, budget_service):
        """Test updating non-existent budget returns None"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        update_data = BudgetUpdate(amount=Decimal("600.00"))
        
        result = budget_service.update_budget(999, update_data, user.id)
        
        assert result is None
    
    def test_delete_budget(self, db_session, budget_service):
        """Test budget deletion"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id
        )
        
        result = budget_service.delete_budget(budget.id, user.id)
        
        assert result is True
        
        # Verify budget is deleted
        deleted_budget = db_session.query(Budget).filter(
            Budget.id == budget.id
        ).first()
        assert deleted_budget is None
    
    def test_delete_budget_not_found(self, db_session, budget_service):
        """Test deleting non-existent budget returns False"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        result = budget_service.delete_budget(999, user.id)
        
        assert result is False
    
    def test_calculate_spending_for_budget(self, db_session, budget_service):
        """Test spending calculation for a budget period"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        # Create expenses within budget period
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("50.00"),
            expense_date=date(2024, 1, 15)
        )
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("30.00"),
            expense_date=date(2024, 1, 20)
        )
        
        # Create expense outside budget period (should not be counted)
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("100.00"),
            expense_date=date(2024, 2, 1)
        )
        
        spending = budget_service.calculate_spending_for_budget(budget)
        
        assert spending == Decimal("80.00")
    
    def test_get_budget_with_spending(self, db_session, budget_service):
        """Test getting budget with spending calculations"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("100.00"),
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        # Create expense
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("40.00"),
            expense_date=date(2024, 1, 15)
        )
        
        result = budget_service.get_budget_with_spending(budget.id, user.id)
        
        assert result is not None
        assert result.current_spending == Decimal("40.00")
        assert result.remaining_amount == Decimal("60.00")
        assert result.percentage_used == 40.0
    
    def test_get_budget_summary(self, db_session, budget_service):
        """Test budget summary calculation"""
        user = UserFactory(sqlalchemy_session=db_session)
        category1 = CategoryFactory(sqlalchemy_session=db_session)
        category2 = CategoryFactory(sqlalchemy_session=db_session)
        
        today = date.today()
        
        # Create active budgets
        budget1 = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category1.id,
            amount=Decimal("100.00"),
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=5)
        )
        budget2 = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category2.id,
            amount=Decimal("200.00"),
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=5)
        )
        
        # Create expenses - one over budget, one near limit
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category1.id,
            amount=Decimal("120.00"),  # Over budget
            expense_date=today
        )
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category2.id,
            amount=Decimal("170.00"),  # 85% of budget (near limit)
            expense_date=today
        )
        
        summary = budget_service.get_budget_summary(user.id)
        
        assert summary.total_budgets == 2
        assert summary.total_budget_amount == Decimal("300.00")
        assert summary.total_spending == Decimal("290.00")
        assert summary.budgets_over_limit == 1
        assert summary.budgets_near_limit == 2  # Both budgets are over 80%
    
    def test_check_budget_alerts(self, db_session, budget_service):
        """Test budget alert checking"""
        user = UserFactory(sqlalchemy_session=db_session)
        category1 = CategoryFactory(sqlalchemy_session=db_session)
        category2 = CategoryFactory(sqlalchemy_session=db_session)
        
        today = date.today()
        
        # Create budgets
        budget1 = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category1.id,
            amount=Decimal("100.00"),
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=5)
        )
        budget2 = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category2.id,
            amount=Decimal("100.00"),
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=5)
        )
        
        # Create expenses
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category1.id,
            amount=Decimal("120.00"),  # Over budget
            expense_date=today
        )
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category2.id,
            amount=Decimal("85.00"),  # Near limit
            expense_date=today
        )
        
        alerts = budget_service.check_budget_alerts(user.id)
        
        assert len(alerts) == 2
        
        # Check over budget alert
        over_budget_alert = next(alert for alert in alerts if alert['type'] == 'over_budget')
        assert over_budget_alert['budget_id'] == budget1.id
        assert over_budget_alert['percentage_used'] == 120.0
        
        # Check near limit alert
        near_limit_alert = next(alert for alert in alerts if alert['type'] == 'near_limit')
        assert near_limit_alert['budget_id'] == budget2.id
        assert near_limit_alert['percentage_used'] == 85.0
    
    def test_generate_budget_periods_weekly(self, db_session, budget_service):
        """Test generating weekly budget periods"""
        start_date = date(2024, 1, 1)  # Monday
        
        periods = budget_service.generate_budget_periods(
            BudgetPeriod.WEEKLY, start_date, num_periods=3
        )
        
        assert len(periods) == 3
        
        # First week
        assert periods[0]['start_date'] == date(2024, 1, 1)
        assert periods[0]['end_date'] == date(2024, 1, 7)
        
        # Second week
        assert periods[1]['start_date'] == date(2024, 1, 8)
        assert periods[1]['end_date'] == date(2024, 1, 14)
        
        # Third week
        assert periods[2]['start_date'] == date(2024, 1, 15)
        assert periods[2]['end_date'] == date(2024, 1, 21)
    
    def test_generate_budget_periods_monthly(self, db_session, budget_service):
        """Test generating monthly budget periods"""
        start_date = date(2024, 1, 1)
        
        periods = budget_service.generate_budget_periods(
            BudgetPeriod.MONTHLY, start_date, num_periods=3
        )
        
        assert len(periods) == 3
        
        # January
        assert periods[0]['start_date'] == date(2024, 1, 1)
        assert periods[0]['end_date'] == date(2024, 1, 31)
        
        # February
        assert periods[1]['start_date'] == date(2024, 2, 1)
        assert periods[1]['end_date'] == date(2024, 2, 29)  # 2024 is leap year
        
        # March
        assert periods[2]['start_date'] == date(2024, 3, 1)
        assert periods[2]['end_date'] == date(2024, 3, 31)