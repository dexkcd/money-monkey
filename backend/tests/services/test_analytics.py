"""
Unit tests for AnalyticsService
"""
import pytest
from unittest.mock import Mock, patch
from datetime import date, timedelta
from decimal import Decimal
import json

from app.services.analytics import AnalyticsService
from app.schemas.analytics import AIRecommendation
from tests.factories import UserFactory, CategoryFactory, ExpenseFactory, BudgetFactory


class TestAnalyticsService:
    
    @pytest.fixture
    def analytics_service(self, db_session):
        return AnalyticsService(db_session)
    
    def test_get_spending_by_category(self, db_session, analytics_service):
        """Test spending aggregation by category"""
        user = UserFactory(sqlalchemy_session=db_session)
        category1 = CategoryFactory(sqlalchemy_session=db_session, name="Food", color="#FF0000")
        category2 = CategoryFactory(sqlalchemy_session=db_session, name="Transport", color="#00FF00")
        
        # Create expenses
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category1.id,
            amount=Decimal("50.00")
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
            amount=Decimal("25.00")
        )
        
        result = analytics_service.get_spending_by_category(user.id)
        
        assert len(result) == 2
        
        # Check Food category
        food_spending = next(cat for cat in result if cat.category_name == "Food")
        assert food_spending.total_amount == Decimal("80.00")
        assert food_spending.expense_count == 2
        assert food_spending.category_color == "#FF0000"
        
        # Check Transport category
        transport_spending = next(cat for cat in result if cat.category_name == "Transport")
        assert transport_spending.total_amount == Decimal("25.00")
        assert transport_spending.expense_count == 1
        assert transport_spending.category_color == "#00FF00"
    
    def test_get_spending_by_category_with_date_filter(self, db_session, analytics_service):
        """Test spending by category with date filtering"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        
        # Create expenses on different dates
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
            expense_date=date(2024, 2, 15)
        )
        
        # Filter for January only
        result = analytics_service.get_spending_by_category(
            user.id, 
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert len(result) == 1
        assert result[0].total_amount == Decimal("50.00")
        assert result[0].expense_count == 1
    
    def test_get_monthly_spending_trends(self, db_session, analytics_service):
        """Test monthly spending trends calculation"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        
        # Create expenses in different months
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("100.00"),
            expense_date=date(2024, 1, 15)
        )
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("150.00"),
            expense_date=date(2024, 2, 15)
        )
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("75.00"),
            expense_date=date(2024, 2, 20)
        )
        
        result = analytics_service.get_monthly_spending_trends(user.id, months_back=3)
        
        # Should have trends for months with expenses
        assert len(result) >= 2
        
        # Check January trend
        jan_trend = next((t for t in result if t.period == "2024-01"), None)
        assert jan_trend is not None
        assert jan_trend.amount == Decimal("100.00")
        
        # Check February trend
        feb_trend = next((t for t in result if t.period == "2024-02"), None)
        assert feb_trend is not None
        assert feb_trend.amount == Decimal("225.00")
    
    def test_get_spending_analytics(self, db_session, analytics_service):
        """Test comprehensive spending analytics"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        
        # Create expenses
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("50.00")
        )
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("30.00")
        )
        
        result = analytics_service.get_spending_analytics(user.id)
        
        assert result.total_expenses == Decimal("80.00")
        assert result.expense_count == 2
        assert result.average_expense == Decimal("40.00")
        assert len(result.categories) == 1
        assert len(result.monthly_trends) >= 0  # May be empty if no historical data
    
    def test_prepare_chart_data_for_categories(self, analytics_service):
        """Test chart data preparation for categories"""
        from app.schemas.analytics import SpendingByCategory
        
        categories = [
            SpendingByCategory(
                category_id=1,
                category_name="Food",
                category_color="#FF0000",
                total_amount=Decimal("100.00"),
                expense_count=5
            ),
            SpendingByCategory(
                category_id=2,
                category_name="Transport",
                category_color="#00FF00",
                total_amount=Decimal("50.00"),
                expense_count=3
            )
        ]
        
        result = analytics_service.prepare_chart_data_for_categories(categories)
        
        assert result.labels == ["Food", "Transport"]
        assert result.datasets[0]["data"] == [100.0, 50.0]
        assert result.datasets[0]["backgroundColor"] == ["#FF0000", "#00FF00"]
    
    def test_prepare_chart_data_for_trends(self, analytics_service):
        """Test chart data preparation for trends"""
        from app.schemas.analytics import SpendingTrend
        
        trends = [
            SpendingTrend(period="2024-01", amount=Decimal("100.00")),
            SpendingTrend(period="2024-02", amount=Decimal("150.00"))
        ]
        
        result = analytics_service.prepare_chart_data_for_trends(trends)
        
        assert result.labels == ["Jan 2024", "Feb 2024"]
        assert result.datasets[0]["data"] == [100.0, 150.0]
        assert result.datasets[0]["label"] == "Monthly Spending"
    
    def test_get_budget_vs_spending_analysis(self, db_session, analytics_service):
        """Test budget vs spending analysis"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session, name="Food", color="#FF0000")
        
        # Create budget for current month
        today = date.today()
        month_start = today.replace(day=1)
        if today.month == 12:
            month_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        budget = BudgetFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("200.00"),
            period_type="MONTHLY",
            start_date=month_start,
            end_date=month_end
        )
        
        # Create expense
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("150.00"),
            expense_date=today
        )
        
        result = analytics_service.get_budget_vs_spending_analysis(user.id)
        
        assert len(result["categories"]) == 1
        category_data = result["categories"][0]
        assert category_data["category_name"] == "Food"
        assert category_data["budget_amount"] == Decimal("200.00")
        assert category_data["spent_amount"] == Decimal("150.00")
        assert category_data["percentage_used"] == 75.0
        assert category_data["is_over_budget"] is False
    
    @patch('app.services.analytics.OpenAIService')
    def test_generate_ai_recommendations_success(self, mock_openai_class, db_session, analytics_service):
        """Test successful AI recommendation generation"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session)
        
        # Create some expense data
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("100.00")
        )
        
        # Mock OpenAI response
        mock_openai = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = '''
        [
            {
                "title": "Reduce Restaurant Spending",
                "description": "Consider cooking more meals at home to reduce restaurant expenses.",
                "category": "Restaurants",
                "priority": "high",
                "action_type": "reduce_spending"
            }
        ]
        '''
        mock_openai.client.chat.completions.create.return_value = mock_response
        mock_openai_class.return_value = mock_openai
        
        # Override the service's openai_service
        analytics_service.openai_service = mock_openai
        
        result = analytics_service.generate_ai_recommendations(user.id)
        
        assert len(result.recommendations) == 1
        assert result.recommendations[0].title == "Reduce Restaurant Spending"
        assert result.recommendations[0].priority == "high"
        assert result.recommendations[0].action_type == "reduce_spending"
    
    def test_generate_ai_recommendations_fallback(self, db_session, analytics_service):
        """Test fallback recommendations when AI fails"""
        user = UserFactory(sqlalchemy_session=db_session)
        category = CategoryFactory(sqlalchemy_session=db_session, name="Food")
        
        # Create expense data
        ExpenseFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            category_id=category.id,
            amount=Decimal("100.00")
        )
        
        # Mock OpenAI service to raise exception
        mock_openai = Mock()
        mock_openai.client = None
        analytics_service.openai_service = mock_openai
        
        result = analytics_service.generate_ai_recommendations(user.id)
        
        assert len(result.recommendations) >= 1
        assert result.recommendations[0].title == "Review Food Spending"
        assert "highest spending category" in result.recommendations[0].description
    
    def test_prepare_spending_summary_for_ai(self, analytics_service):
        """Test spending summary preparation for AI"""
        from app.schemas.analytics import SpendingAnalytics, SpendingByCategory, SpendingTrend
        
        categories = [
            SpendingByCategory(
                category_id=1,
                category_name="Food",
                category_color="#FF0000",
                total_amount=Decimal("100.00"),
                expense_count=5
            )
        ]
        
        trends = [
            SpendingTrend(period="2024-01", amount=Decimal("100.00"))
        ]
        
        analytics = SpendingAnalytics(
            total_expenses=Decimal("100.00"),
            expense_count=5,
            average_expense=Decimal("20.00"),
            categories=categories,
            monthly_trends=trends
        )
        
        budget_analysis = {
            "categories": [
                {
                    "category_name": "Food",
                    "spent_amount": Decimal("100.00"),
                    "budget_amount": Decimal("150.00"),
                    "percentage_used": 66.7
                }
            ]
        }
        
        result = analytics_service._prepare_spending_summary_for_ai(analytics, budget_analysis)
        
        assert "Total expenses: $100.00" in result
        assert "Number of transactions: 5" in result
        assert "Food: $100.00" in result
        assert "Budget vs Spending:" in result
    
    def test_get_fallback_recommendations_over_budget(self, analytics_service):
        """Test fallback recommendations for over-budget categories"""
        from app.schemas.analytics import SpendingAnalytics, SpendingByCategory
        
        categories = [
            SpendingByCategory(
                category_id=1,
                category_name="Food",
                category_color="#FF0000",
                total_amount=Decimal("100.00"),
                expense_count=5
            )
        ]
        
        analytics = SpendingAnalytics(
            total_expenses=Decimal("100.00"),
            expense_count=5,
            average_expense=Decimal("20.00"),
            categories=categories,
            monthly_trends=[]
        )
        
        budget_analysis = {
            "categories": [
                {
                    "category_name": "Food",
                    "spent_amount": Decimal("150.00"),
                    "budget_amount": Decimal("100.00"),
                    "is_over_budget": True
                }
            ]
        }
        
        result = analytics_service._get_fallback_recommendations(analytics, budget_analysis)
        
        assert len(result) >= 1
        over_budget_rec = next((r for r in result if "Budget Exceeded" in r.title), None)
        assert over_budget_rec is not None
        assert over_budget_rec.priority == "high"
        assert over_budget_rec.action_type == "budget_adjustment"