from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta

from ...core.deps import get_current_user, get_db
from ...models.user import User
from ...services.analytics import AnalyticsService
from ...schemas.analytics import (
    SpendingAnalytics, SpendingByCategory, MonthlySpending,
    ChartData, RecommendationResponse, AnalyticsRequest,
    TrendAnalysisRequest
)

router = APIRouter()


@router.get("/spending", response_model=SpendingAnalytics)
async def get_spending_analytics(
    start_date: Optional[date] = Query(None, description="Start date for analysis (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date for analysis (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive spending analytics for the current user.
    
    - **start_date**: Optional start date for analysis period
    - **end_date**: Optional end date for analysis period
    - Returns total expenses, category breakdown, and monthly trends
    """
    analytics_service = AnalyticsService(db)
    
    # Default to last 6 months if no dates provided
    if not start_date and not end_date:
        end_date = date.today()
        start_date = end_date - timedelta(days=180)
    
    try:
        analytics = analytics_service.get_spending_analytics(
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date
        )
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate analytics: {str(e)}")


@router.get("/categories", response_model=List[SpendingByCategory])
async def get_spending_by_category(
    start_date: Optional[date] = Query(None, description="Start date for analysis (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date for analysis (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get spending breakdown by category.
    
    - **start_date**: Optional start date for analysis period
    - **end_date**: Optional end date for analysis period
    - Returns spending totals and counts for each category
    """
    analytics_service = AnalyticsService(db)
    
    try:
        categories = analytics_service.get_spending_by_category(
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date
        )
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get category spending: {str(e)}")


@router.get("/trends", response_model=ChartData)
async def get_spending_trends(
    months_back: int = Query(12, ge=1, le=24, description="Number of months to include in trends"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get monthly spending trends formatted for chart visualization.
    
    - **months_back**: Number of months to include (1-24, default: 12)
    - Returns chart-ready data with labels and datasets
    """
    analytics_service = AnalyticsService(db)
    
    try:
        trends = analytics_service.get_monthly_spending_trends(
            user_id=current_user.id,
            months_back=months_back
        )
        chart_data = analytics_service.prepare_chart_data_for_trends(trends)
        return chart_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get spending trends: {str(e)}")


@router.get("/categories/chart", response_model=ChartData)
async def get_category_chart_data(
    start_date: Optional[date] = Query(None, description="Start date for analysis (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date for analysis (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get category spending data formatted for chart visualization.
    
    - **start_date**: Optional start date for analysis period
    - **end_date**: Optional end date for analysis period
    - Returns chart-ready data with category colors and amounts
    """
    analytics_service = AnalyticsService(db)
    
    try:
        categories = analytics_service.get_spending_by_category(
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date
        )
        chart_data = analytics_service.prepare_chart_data_for_categories(categories)
        return chart_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get category chart data: {str(e)}")


@router.get("/budget-comparison")
async def get_budget_vs_spending(
    month: Optional[date] = Query(None, description="Month for comparison (YYYY-MM-DD, uses current month if not provided)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compare spending against budgets for a specific month.
    
    - **month**: Month to analyze (defaults to current month)
    - Returns budget vs actual spending comparison by category
    """
    analytics_service = AnalyticsService(db)
    
    try:
        comparison = analytics_service.get_budget_vs_spending_analysis(
            user_id=current_user.id,
            month=month
        )
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get budget comparison: {str(e)}")


@router.get("/recommendations", response_model=RecommendationResponse)
async def get_ai_recommendations(
    analysis_months: int = Query(3, ge=1, le=12, description="Number of months to analyze for recommendations"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-powered spending recommendations based on user's spending patterns.
    
    - **analysis_months**: Number of months to analyze (1-12, default: 3)
    - Returns personalized recommendations for improving spending habits
    """
    analytics_service = AnalyticsService(db)
    
    try:
        recommendations = analytics_service.generate_ai_recommendations(
            user_id=current_user.id,
            analysis_period_months=analysis_months
        )
        return recommendations
    except Exception as e:
        # Return fallback recommendations if AI generation fails
        try:
            # Get basic analytics for fallback recommendations
            analytics = analytics_service.get_spending_analytics(
                user_id=current_user.id,
                start_date=date.today() - timedelta(days=analysis_months * 30),
                end_date=date.today()
            )
            budget_analysis = analytics_service.get_budget_vs_spending_analysis(current_user.id)
            
            fallback_recommendations = analytics_service._get_fallback_recommendations(
                analytics, budget_analysis
            )
            
            from ...schemas.analytics import RecommendationResponse
            return RecommendationResponse(
                recommendations=fallback_recommendations,
                analysis_summary=f"Basic analysis based on {analysis_months} months of spending data (AI unavailable)",
                generated_at=date.today()
            )
        except Exception as fallback_error:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate recommendations: {str(e)}. Fallback also failed: {str(fallback_error)}"
            )


@router.get("/summary")
async def get_spending_summary(
    period: str = Query("month", regex="^(week|month|quarter|year)$", description="Summary period"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a quick spending summary for different time periods.
    
    - **period**: Time period for summary (week, month, quarter, year)
    - Returns total spending, transaction count, and top categories
    """
    analytics_service = AnalyticsService(db)
    
    # Calculate date range based on period
    end_date = date.today()
    if period == "week":
        start_date = end_date - timedelta(days=7)
    elif period == "month":
        start_date = end_date.replace(day=1)
    elif period == "quarter":
        quarter_start_month = ((end_date.month - 1) // 3) * 3 + 1
        start_date = end_date.replace(month=quarter_start_month, day=1)
    elif period == "year":
        start_date = end_date.replace(month=1, day=1)
    else:
        start_date = end_date.replace(day=1)  # Default to month
    
    try:
        analytics = analytics_service.get_spending_analytics(
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Get top 3 categories by spending
        top_categories = sorted(
            analytics.categories, 
            key=lambda x: x.total_amount, 
            reverse=True
        )[:3]
        
        return {
            "period": period,
            "start_date": start_date,
            "end_date": end_date,
            "total_spending": analytics.total_expenses,
            "transaction_count": analytics.expense_count,
            "average_transaction": analytics.average_expense,
            "top_categories": [
                {
                    "name": cat.category_name,
                    "amount": cat.total_amount,
                    "percentage": float((cat.total_amount / analytics.total_expenses) * 100) if analytics.total_expenses > 0 else 0
                }
                for cat in top_categories
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get spending summary: {str(e)}")