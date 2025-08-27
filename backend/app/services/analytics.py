from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, desc
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, datetime, timedelta
from decimal import Decimal
from collections import defaultdict
import calendar

from ..models.expense import Expense
from ..models.category import Category
from ..models.budget import Budget
from ..schemas.analytics import (
    SpendingByCategory, MonthlySpending, SpendingTrend, 
    SpendingAnalytics, ChartData, ChartDataPoint,
    AIRecommendation, RecommendationResponse
)
from .openai_service import OpenAIService


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.openai_service = OpenAIService()
    
    def get_spending_by_category(
        self, 
        user_id: int, 
        start_date: Optional[date] = None, 
        end_date: Optional[date] = None
    ) -> List[SpendingByCategory]:
        """Get spending aggregated by category for a date range"""
        query = (
            self.db.query(
                Category.id,
                Category.name,
                Category.color,
                func.sum(Expense.amount).label('total_amount'),
                func.count(Expense.id).label('expense_count')
            )
            .join(Expense, Category.id == Expense.category_id)
            .filter(Expense.user_id == user_id)
        )
        
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)
        
        results = query.group_by(Category.id, Category.name, Category.color).all()
        
        return [
            SpendingByCategory(
                category_id=result.id,
                category_name=result.name,
                category_color=result.color,
                total_amount=result.total_amount or Decimal('0'),
                expense_count=result.expense_count or 0
            )
            for result in results
        ]
    
    def get_monthly_spending_trends(
        self, 
        user_id: int, 
        months_back: int = 12
    ) -> List[SpendingTrend]:
        """Get monthly spending trends for the specified number of months"""
        end_date = date.today()
        start_date = end_date.replace(day=1) - timedelta(days=months_back * 30)
        
        # Query monthly spending
        results = (
            self.db.query(
                extract('year', Expense.expense_date).label('year'),
                extract('month', Expense.expense_date).label('month'),
                func.sum(Expense.amount).label('total_amount')
            )
            .filter(
                and_(
                    Expense.user_id == user_id,
                    Expense.expense_date >= start_date,
                    Expense.expense_date <= end_date
                )
            )
            .group_by(
                extract('year', Expense.expense_date),
                extract('month', Expense.expense_date)
            )
            .order_by(
                extract('year', Expense.expense_date),
                extract('month', Expense.expense_date)
            )
            .all()
        )
        
        trends = []
        for result in results:
            period = f"{int(result.year)}-{int(result.month):02d}"
            trends.append(SpendingTrend(
                period=period,
                amount=result.total_amount or Decimal('0')
            ))
        
        return trends
    
    def get_spending_analytics(
        self, 
        user_id: int, 
        start_date: Optional[date] = None, 
        end_date: Optional[date] = None
    ) -> SpendingAnalytics:
        """Get comprehensive spending analytics"""
        # Base query for expenses in date range
        expense_query = self.db.query(Expense).filter(Expense.user_id == user_id)
        
        if start_date:
            expense_query = expense_query.filter(Expense.expense_date >= start_date)
        if end_date:
            expense_query = expense_query.filter(Expense.expense_date <= end_date)
        
        # Get total statistics
        total_stats = (
            expense_query
            .with_entities(
                func.sum(Expense.amount).label('total_amount'),
                func.count(Expense.id).label('expense_count'),
                func.avg(Expense.amount).label('average_amount')
            )
            .first()
        )
        
        total_expenses = total_stats.total_amount or Decimal('0')
        expense_count = total_stats.expense_count or 0
        average_expense = total_stats.average_amount or Decimal('0')
        
        # Get category breakdown
        categories = self.get_spending_by_category(user_id, start_date, end_date)
        
        # Get monthly trends
        monthly_trends = self.get_monthly_spending_trends(user_id)
        
        return SpendingAnalytics(
            total_expenses=total_expenses,
            expense_count=expense_count,
            average_expense=average_expense,
            categories=categories,
            monthly_trends=monthly_trends
        )
    
    def prepare_chart_data_for_categories(
        self, 
        categories: List[SpendingByCategory]
    ) -> ChartData:
        """Prepare chart data for category spending visualization"""
        labels = [cat.category_name for cat in categories]
        amounts = [float(cat.total_amount) for cat in categories]
        colors = [cat.category_color for cat in categories]
        
        dataset = {
            "label": "Spending by Category",
            "data": amounts,
            "backgroundColor": colors,
            "borderColor": colors,
            "borderWidth": 1
        }
        
        return ChartData(
            labels=labels,
            datasets=[dataset]
        )
    
    def prepare_chart_data_for_trends(
        self, 
        trends: List[SpendingTrend]
    ) -> ChartData:
        """Prepare chart data for spending trends visualization"""
        labels = []
        amounts = []
        
        for trend in trends:
            # Convert YYYY-MM to readable format
            year, month = trend.period.split('-')
            month_name = calendar.month_abbr[int(month)]
            labels.append(f"{month_name} {year}")
            amounts.append(float(trend.amount))
        
        dataset = {
            "label": "Monthly Spending",
            "data": amounts,
            "borderColor": "#3B82F6",
            "backgroundColor": "rgba(59, 130, 246, 0.1)",
            "borderWidth": 2,
            "fill": True
        }
        
        return ChartData(
            labels=labels,
            datasets=[dataset]
        )
    
    def get_budget_vs_spending_analysis(
        self, 
        user_id: int, 
        month: Optional[date] = None
    ) -> Dict[str, Any]:
        """Compare spending against budgets for a specific month"""
        if not month:
            month = date.today().replace(day=1)
        
        # Get month start and end dates
        month_start = month.replace(day=1)
        if month.month == 12:
            month_end = month.replace(year=month.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = month.replace(month=month.month + 1, day=1) - timedelta(days=1)
        
        # Get spending by category for the month
        spending = self.get_spending_by_category(user_id, month_start, month_end)
        
        # Get budgets for the month
        budgets = (
            self.db.query(Budget, Category.name, Category.color)
            .join(Category, Budget.category_id == Category.id)
            .filter(
                and_(
                    Budget.user_id == user_id,
                    Budget.period_type == 'MONTHLY',
                    Budget.start_date <= month_start,
                    Budget.end_date >= month_end
                )
            )
            .all()
        )
        
        # Create comparison data
        comparison = []
        spending_dict = {s.category_id: s for s in spending}
        
        for budget, category_name, category_color in budgets:
            spent = spending_dict.get(budget.category_id)
            spent_amount = spent.total_amount if spent else Decimal('0')
            
            comparison.append({
                "category_id": budget.category_id,
                "category_name": category_name,
                "category_color": category_color,
                "budget_amount": budget.amount,
                "spent_amount": spent_amount,
                "remaining_amount": budget.amount - spent_amount,
                "percentage_used": float((spent_amount / budget.amount) * 100) if budget.amount > 0 else 0,
                "is_over_budget": spent_amount > budget.amount
            })
        
        return {
            "month": month.strftime("%Y-%m"),
            "categories": comparison,
            "total_budgeted": sum(b[0].amount for b in budgets),
            "total_spent": sum(float(s.total_amount) for s in spending),
        }
    
    def generate_ai_recommendations(
        self, 
        user_id: int, 
        analysis_period_months: int = 3
    ) -> RecommendationResponse:
        """Generate AI-powered spending recommendations based on user's spending patterns"""
        # Get recent spending data
        end_date = date.today()
        start_date = end_date - timedelta(days=analysis_period_months * 30)
        
        analytics = self.get_spending_analytics(user_id, start_date, end_date)
        budget_analysis = self.get_budget_vs_spending_analysis(user_id)
        
        # Prepare data for AI analysis
        spending_summary = self._prepare_spending_summary_for_ai(analytics, budget_analysis)
        
        try:
            recommendations = self._get_ai_recommendations(spending_summary)
            
            return RecommendationResponse(
                recommendations=recommendations,
                analysis_summary=f"Analysis based on {analysis_period_months} months of spending data",
                generated_at=date.today()
            )
        except Exception as e:
            # Return fallback recommendations if AI fails
            return RecommendationResponse(
                recommendations=self._get_fallback_recommendations(analytics, budget_analysis),
                analysis_summary=f"Basic analysis based on {analysis_period_months} months of spending data",
                generated_at=date.today()
            )
    
    def _prepare_spending_summary_for_ai(
        self, 
        analytics: SpendingAnalytics, 
        budget_analysis: Dict[str, Any]
    ) -> str:
        """Prepare spending data summary for AI analysis"""
        summary_parts = [
            f"Total expenses: ${analytics.total_expenses}",
            f"Number of transactions: {analytics.expense_count}",
            f"Average transaction: ${analytics.average_expense}",
            "",
            "Spending by category:"
        ]
        
        for category in analytics.categories:
            percentage = (float(category.total_amount) / float(analytics.total_expenses)) * 100 if analytics.total_expenses > 0 else 0
            summary_parts.append(f"- {category.category_name}: ${category.total_amount} ({percentage:.1f}%)")
        
        summary_parts.extend(["", "Budget vs Spending:"])
        for category in budget_analysis.get("categories", []):
            summary_parts.append(
                f"- {category['category_name']}: ${category['spent_amount']} / ${category['budget_amount']} "
                f"({category['percentage_used']:.1f}% used)"
            )
        
        if analytics.monthly_trends:
            summary_parts.extend(["", "Recent monthly trends:"])
            for trend in analytics.monthly_trends[-3:]:  # Last 3 months
                summary_parts.append(f"- {trend.period}: ${trend.amount}")
        
        return "\n".join(summary_parts)
    
    def _get_ai_recommendations(self, spending_summary: str) -> List[AIRecommendation]:
        """Get AI-generated recommendations using OpenAI"""
        if not self.openai_service.client:
            raise Exception("OpenAI client not available")
        
        prompt = f"""
        Based on the following spending analysis, provide 3-5 personalized financial recommendations.
        Focus on actionable advice for improving spending habits, budget optimization, and financial health.
        
        Spending Analysis:
        {spending_summary}
        
        For each recommendation, provide:
        1. A clear, actionable title
        2. A detailed description explaining the recommendation
        3. The category it relates to (if applicable)
        4. Priority level (high/medium/low)
        5. Action type (reduce_spending/budget_adjustment/category_optimization)
        
        Return the response as a JSON array with this structure:
        [
            {{
                "title": "Recommendation title",
                "description": "Detailed explanation and actionable steps",
                "category": "category name or null",
                "priority": "high/medium/low",
                "action_type": "reduce_spending/budget_adjustment/category_optimization"
            }}
        ]
        
        Focus on practical, specific advice rather than generic tips.
        """
        
        response = self.openai_service.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        
        # Parse the JSON response
        import json
        import re
        
        try:
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                recommendations_data = json.loads(json_match.group())
            else:
                raise ValueError("No JSON found in response")
            
            recommendations = []
            for rec_data in recommendations_data:
                recommendations.append(AIRecommendation(
                    title=rec_data.get("title", "Financial Recommendation"),
                    description=rec_data.get("description", "Consider reviewing your spending patterns."),
                    category=rec_data.get("category"),
                    priority=rec_data.get("priority", "medium"),
                    action_type=rec_data.get("action_type", "category_optimization")
                ))
            
            return recommendations
            
        except Exception as e:
            raise Exception(f"Failed to parse AI recommendations: {str(e)}")
    
    def _get_fallback_recommendations(
        self, 
        analytics: SpendingAnalytics, 
        budget_analysis: Dict[str, Any]
    ) -> List[AIRecommendation]:
        """Generate basic recommendations when AI is unavailable"""
        recommendations = []
        
        # Find highest spending category
        if analytics.categories:
            highest_category = max(analytics.categories, key=lambda x: x.total_amount)
            recommendations.append(AIRecommendation(
                title=f"Review {highest_category.category_name} Spending",
                description=f"Your highest spending category is {highest_category.category_name} at ${highest_category.total_amount}. "
                           f"Consider tracking individual expenses in this category to identify potential savings.",
                category=highest_category.category_name,
                priority="high",
                action_type="reduce_spending"
            ))
        
        # Check for over-budget categories
        over_budget_categories = [
            cat for cat in budget_analysis.get("categories", [])
            if cat["is_over_budget"]
        ]
        
        if over_budget_categories:
            for category in over_budget_categories[:2]:  # Limit to 2 recommendations
                recommendations.append(AIRecommendation(
                    title=f"Budget Exceeded: {category['category_name']}",
                    description=f"You've spent ${category['spent_amount']} against a budget of ${category['budget_amount']} "
                               f"in {category['category_name']}. Consider adjusting your budget or reducing spending in this area.",
                    category=category['category_name'],
                    priority="high",
                    action_type="budget_adjustment"
                ))
        
        # General recommendation if no specific issues
        if not recommendations:
            recommendations.append(AIRecommendation(
                title="Track Your Spending Patterns",
                description="Continue monitoring your expenses to identify trends and opportunities for optimization. "
                           "Regular review of your spending habits can help you make better financial decisions.",
                category=None,
                priority="medium",
                action_type="category_optimization"
            ))
        
        return recommendations