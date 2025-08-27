from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc

from ..models.budget import Budget
from ..models.expense import Expense
from ..models.category import Category
from ..schemas.budget import (
    BudgetCreate, 
    BudgetUpdate, 
    BudgetResponse, 
    BudgetSummary, 
    SpendingAggregation,
    BudgetPeriod
)


class BudgetService:
    def __init__(self, db: Session):
        self.db = db

    def create_budget(self, budget_data: BudgetCreate, user_id: int) -> Budget:
        """Create a new budget for a user."""
        # Validate that category exists and belongs to user or is default
        category = self.db.query(Category).filter(
            Category.id == budget_data.category_id,
            (Category.user_id == user_id) | (Category.is_default == True)
        ).first()
        
        if not category:
            raise ValueError("Category not found or not accessible")

        # Check for overlapping budgets for the same category and period type
        existing_budget = self.db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.category_id == budget_data.category_id,
            Budget.period_type == budget_data.period_type,
            Budget.start_date <= budget_data.end_date,
            Budget.end_date >= budget_data.start_date
        ).first()

        if existing_budget:
            raise ValueError(f"Budget already exists for this category and period that overlaps with the specified dates")

        budget = Budget(
            user_id=user_id,
            category_id=budget_data.category_id,
            amount=budget_data.amount,
            period_type=budget_data.period_type.value,
            start_date=budget_data.start_date,
            end_date=budget_data.end_date
        )
        
        self.db.add(budget)
        self.db.commit()
        self.db.refresh(budget)
        return budget

    def get_budget(self, budget_id: int, user_id: int) -> Optional[Budget]:
        """Get a specific budget by ID for a user."""
        return self.db.query(Budget).filter(
            Budget.id == budget_id,
            Budget.user_id == user_id
        ).first()

    def get_budgets(self, user_id: int, category_id: Optional[int] = None, 
                   period_type: Optional[BudgetPeriod] = None,
                   active_only: bool = False) -> List[Budget]:
        """Get all budgets for a user with optional filtering."""
        query = self.db.query(Budget).filter(Budget.user_id == user_id)
        
        if category_id:
            query = query.filter(Budget.category_id == category_id)
        
        if period_type:
            query = query.filter(Budget.period_type == period_type.value)
        
        if active_only:
            today = date.today()
            query = query.filter(
                Budget.start_date <= today,
                Budget.end_date >= today
            )
        
        return query.order_by(desc(Budget.created_at)).all()

    def update_budget(self, budget_id: int, budget_data: BudgetUpdate, user_id: int) -> Optional[Budget]:
        """Update an existing budget."""
        budget = self.get_budget(budget_id, user_id)
        if not budget:
            return None

        # Validate category if being updated
        if budget_data.category_id:
            category = self.db.query(Category).filter(
                Category.id == budget_data.category_id,
                (Category.user_id == user_id) | (Category.is_default == True)
            ).first()
            
            if not category:
                raise ValueError("Category not found or not accessible")

        # Update fields
        update_data = budget_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'period_type' and value:
                setattr(budget, field, value.value)
            else:
                setattr(budget, field, value)

        # Validate date range if both dates are being updated
        if budget_data.start_date and budget_data.end_date:
            if budget_data.end_date <= budget_data.start_date:
                raise ValueError("End date must be after start date")

        self.db.commit()
        self.db.refresh(budget)
        return budget

    def delete_budget(self, budget_id: int, user_id: int) -> bool:
        """Delete a budget."""
        budget = self.get_budget(budget_id, user_id)
        if not budget:
            return False

        self.db.delete(budget)
        self.db.commit()
        return True

    def calculate_spending_for_budget(self, budget: Budget) -> Decimal:
        """Calculate total spending for a specific budget period."""
        total_spending = self.db.query(func.sum(Expense.amount)).filter(
            Expense.user_id == budget.user_id,
            Expense.category_id == budget.category_id,
            Expense.expense_date >= budget.start_date,
            Expense.expense_date <= budget.end_date
        ).scalar()
        
        return total_spending or Decimal('0.00')

    def get_budget_with_spending(self, budget_id: int, user_id: int) -> Optional[BudgetResponse]:
        """Get budget with current spending calculations."""
        budget = self.get_budget(budget_id, user_id)
        if not budget:
            return None

        current_spending = self.calculate_spending_for_budget(budget)
        remaining_amount = budget.amount - current_spending
        percentage_used = float((current_spending / budget.amount) * 100) if budget.amount > 0 else 0

        return BudgetResponse(
            id=budget.id,
            user_id=budget.user_id,
            category_id=budget.category_id,
            amount=budget.amount,
            period_type=budget.period_type,
            start_date=budget.start_date,
            end_date=budget.end_date,
            current_spending=current_spending,
            remaining_amount=remaining_amount,
            percentage_used=percentage_used
        )

    def get_budgets_with_spending(self, user_id: int, **filters) -> List[BudgetResponse]:
        """Get all budgets with spending calculations."""
        budgets = self.get_budgets(user_id, **filters)
        budget_responses = []

        for budget in budgets:
            current_spending = self.calculate_spending_for_budget(budget)
            remaining_amount = budget.amount - current_spending
            percentage_used = float((current_spending / budget.amount) * 100) if budget.amount > 0 else 0

            budget_responses.append(BudgetResponse(
                id=budget.id,
                user_id=budget.user_id,
                category_id=budget.category_id,
                amount=budget.amount,
                period_type=budget.period_type,
                start_date=budget.start_date,
                end_date=budget.end_date,
                current_spending=current_spending,
                remaining_amount=remaining_amount,
                percentage_used=percentage_used
            ))

        return budget_responses

    def get_budget_summary(self, user_id: int) -> BudgetSummary:
        """Get budget summary with aggregated statistics."""
        active_budgets = self.get_budgets_with_spending(user_id, active_only=True)
        
        total_budgets = len(active_budgets)
        total_budget_amount = sum(budget.amount for budget in active_budgets)
        total_spending = sum(budget.current_spending or Decimal('0') for budget in active_budgets)
        total_remaining = total_budget_amount - total_spending
        
        budgets_over_limit = sum(1 for budget in active_budgets 
                               if (budget.current_spending or Decimal('0')) > budget.amount)
        budgets_near_limit = sum(1 for budget in active_budgets 
                               if (budget.percentage_used or 0) >= 80)

        return BudgetSummary(
            total_budgets=total_budgets,
            total_budget_amount=total_budget_amount,
            total_spending=total_spending,
            total_remaining=total_remaining,
            budgets_over_limit=budgets_over_limit,
            budgets_near_limit=budgets_near_limit
        )

    def get_spending_aggregation(self, user_id: int, 
                               start_date: Optional[date] = None,
                               end_date: Optional[date] = None) -> List[SpendingAggregation]:
        """Get spending aggregation by category with budget comparison."""
        # Default to current month if no dates provided
        if not start_date or not end_date:
            today = date.today()
            start_date = date(today.year, today.month, 1)
            # Get last day of current month
            if today.month == 12:
                end_date = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)

        # Get spending by category
        spending_query = self.db.query(
            Category.id,
            Category.name,
            func.sum(Expense.amount).label('total_spending')
        ).join(
            Expense, Category.id == Expense.category_id
        ).filter(
            Expense.user_id == user_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date
        ).group_by(Category.id, Category.name)

        spending_results = spending_query.all()

        # Get active budgets for the period
        active_budgets = self.db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.start_date <= end_date,
            Budget.end_date >= start_date
        ).all()

        budget_map = {budget.category_id: budget for budget in active_budgets}

        aggregations = []
        for category_id, category_name, total_spending in spending_results:
            budget = budget_map.get(category_id)
            budget_amount = budget.amount if budget else None
            remaining_amount = None
            percentage_used = None
            is_over_budget = False
            is_near_limit = False

            if budget_amount:
                remaining_amount = budget_amount - total_spending
                percentage_used = float((total_spending / budget_amount) * 100)
                is_over_budget = total_spending > budget_amount
                is_near_limit = percentage_used >= 80

            aggregations.append(SpendingAggregation(
                category_id=category_id,
                category_name=category_name,
                total_spending=total_spending,
                budget_amount=budget_amount,
                remaining_amount=remaining_amount,
                percentage_used=percentage_used,
                is_over_budget=is_over_budget,
                is_near_limit=is_near_limit
            ))

        return aggregations

    def check_budget_alerts(self, user_id: int) -> List[Dict[str, Any]]:
        """Check for budget alerts (80% and 100% thresholds)."""
        active_budgets = self.get_budgets_with_spending(user_id, active_only=True)
        alerts = []

        for budget in active_budgets:
            percentage_used = budget.percentage_used or 0
            
            if percentage_used >= 100:
                alerts.append({
                    'type': 'over_budget',
                    'budget_id': budget.id,
                    'category_id': budget.category_id,
                    'percentage_used': percentage_used,
                    'amount_over': budget.current_spending - budget.amount,
                    'message': f'Budget exceeded for category {budget.category_id}'
                })
            elif percentage_used >= 80:
                alerts.append({
                    'type': 'near_limit',
                    'budget_id': budget.id,
                    'category_id': budget.category_id,
                    'percentage_used': percentage_used,
                    'remaining_amount': budget.remaining_amount,
                    'message': f'Budget at {percentage_used:.1f}% for category {budget.category_id}'
                })

        return alerts

    def generate_budget_periods(self, period_type: BudgetPeriod, 
                              start_date: date, 
                              num_periods: int = 12) -> List[Dict[str, date]]:
        """Generate budget periods for easier budget creation."""
        periods = []
        current_start = start_date

        for _ in range(num_periods):
            if period_type == BudgetPeriod.WEEKLY:
                current_end = current_start + timedelta(days=6)
                periods.append({
                    'start_date': current_start,
                    'end_date': current_end
                })
                current_start = current_end + timedelta(days=1)
            
            elif period_type == BudgetPeriod.MONTHLY:
                # Handle month boundaries properly
                if current_start.month == 12:
                    next_month_start = date(current_start.year + 1, 1, 1)
                else:
                    next_month_start = date(current_start.year, current_start.month + 1, 1)
                
                current_end = next_month_start - timedelta(days=1)
                periods.append({
                    'start_date': current_start,
                    'end_date': current_end
                })
                current_start = next_month_start

        return periods