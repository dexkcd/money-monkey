from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...core.deps import get_db, get_current_user
from ...models.user import User
from ...schemas.budget import (
    BudgetCreate,
    BudgetUpdate,
    BudgetResponse,
    BudgetSummary,
    SpendingAggregation,
    BudgetPeriod
)
from ...services.budget import BudgetService

router = APIRouter()


@router.post("/", response_model=BudgetResponse)
def create_budget(
    budget_data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new budget."""
    budget_service = BudgetService(db)
    
    try:
        budget = budget_service.create_budget(budget_data, current_user.id)
        return budget_service.get_budget_with_spending(budget.id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[BudgetResponse])
def get_budgets(
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    period_type: Optional[BudgetPeriod] = Query(None, description="Filter by period type"),
    active_only: bool = Query(False, description="Only return active budgets"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all budgets for the current user."""
    budget_service = BudgetService(db)
    
    return budget_service.get_budgets_with_spending(
        current_user.id,
        category_id=category_id,
        period_type=period_type,
        active_only=active_only
    )


@router.get("/summary", response_model=BudgetSummary)
def get_budget_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get budget summary with aggregated statistics."""
    budget_service = BudgetService(db)
    return budget_service.get_budget_summary(current_user.id)


@router.get("/spending-aggregation", response_model=List[SpendingAggregation])
def get_spending_aggregation(
    start_date: Optional[date] = Query(None, description="Start date for aggregation"),
    end_date: Optional[date] = Query(None, description="End date for aggregation"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get spending aggregation by category with budget comparison."""
    budget_service = BudgetService(db)
    return budget_service.get_spending_aggregation(
        current_user.id,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/alerts")
def get_budget_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get budget alerts for 80% and 100% thresholds."""
    budget_service = BudgetService(db)
    return budget_service.check_budget_alerts(current_user.id)


@router.get("/periods")
def generate_budget_periods(
    period_type: BudgetPeriod = Query(..., description="Period type for generation"),
    start_date: date = Query(..., description="Start date for period generation"),
    num_periods: int = Query(12, ge=1, le=24, description="Number of periods to generate"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate budget periods for easier budget creation."""
    budget_service = BudgetService(db)
    return budget_service.generate_budget_periods(period_type, start_date, num_periods)


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific budget by ID."""
    budget_service = BudgetService(db)
    budget = budget_service.get_budget_with_spending(budget_id, current_user.id)
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return budget


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget_data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing budget."""
    budget_service = BudgetService(db)
    
    try:
        budget = budget_service.update_budget(budget_id, budget_data, current_user.id)
        if not budget:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        return budget_service.get_budget_with_spending(budget.id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a budget."""
    budget_service = BudgetService(db)
    
    if not budget_service.delete_budget(budget_id, current_user.id):
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return {"message": "Budget deleted successfully"}