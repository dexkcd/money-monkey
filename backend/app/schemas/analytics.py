from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import date
from decimal import Decimal


class SpendingByCategory(BaseModel):
    category_id: int
    category_name: str
    category_color: str
    total_amount: Decimal
    expense_count: int


class MonthlySpending(BaseModel):
    month: str  # YYYY-MM format
    total_amount: Decimal
    categories: List[SpendingByCategory]


class SpendingTrend(BaseModel):
    period: str  # Date or month identifier
    amount: Decimal


class ChartDataPoint(BaseModel):
    label: str
    value: float
    color: Optional[str] = None


class ChartData(BaseModel):
    labels: List[str]
    datasets: List[Dict[str, Any]]


class SpendingAnalytics(BaseModel):
    total_expenses: Decimal
    expense_count: int
    average_expense: Decimal
    categories: List[SpendingByCategory]
    monthly_trends: List[SpendingTrend]


class AIRecommendation(BaseModel):
    title: str
    description: str
    category: Optional[str] = None
    priority: str  # "high", "medium", "low"
    action_type: str  # "reduce_spending", "budget_adjustment", "category_optimization"


class RecommendationResponse(BaseModel):
    recommendations: List[AIRecommendation]
    analysis_summary: str
    generated_at: date


class AnalyticsRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category_ids: Optional[List[int]] = None


class TrendAnalysisRequest(BaseModel):
    period_type: str  # "daily", "weekly", "monthly"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category_id: Optional[int] = None