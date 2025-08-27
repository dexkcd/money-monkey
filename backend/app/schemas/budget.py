from datetime import date
from decimal import Decimal
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, validator


class BudgetPeriod(str, Enum):
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"


class BudgetBase(BaseModel):
    category_id: int = Field(..., gt=0, description="Category ID for the budget")
    amount: Decimal = Field(..., gt=0, description="Budget amount (must be positive)")
    period_type: BudgetPeriod = Field(..., description="Budget period type")
    start_date: date = Field(..., description="Budget period start date")
    end_date: date = Field(..., description="Budget period end date")

    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v

    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Budget amount must be positive')
        return v


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    category_id: Optional[int] = Field(None, gt=0, description="Category ID for the budget")
    amount: Optional[Decimal] = Field(None, gt=0, description="Budget amount (must be positive)")
    period_type: Optional[BudgetPeriod] = Field(None, description="Budget period type")
    start_date: Optional[date] = Field(None, description="Budget period start date")
    end_date: Optional[date] = Field(None, description="Budget period end date")

    @validator('amount')
    def validate_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Budget amount must be positive')
        return v


class BudgetResponse(BudgetBase):
    id: int
    user_id: int
    current_spending: Optional[Decimal] = Field(None, description="Current spending in this budget period")
    remaining_amount: Optional[Decimal] = Field(None, description="Remaining budget amount")
    percentage_used: Optional[float] = Field(None, description="Percentage of budget used")
    
    class Config:
        from_attributes = True


class BudgetSummary(BaseModel):
    total_budgets: int
    total_budget_amount: Decimal
    total_spending: Decimal
    total_remaining: Decimal
    budgets_over_limit: int
    budgets_near_limit: int  # 80% or more


class SpendingAggregation(BaseModel):
    category_id: int
    category_name: str
    total_spending: Decimal
    budget_amount: Optional[Decimal] = None
    remaining_amount: Optional[Decimal] = None
    percentage_used: Optional[float] = None
    is_over_budget: bool = False
    is_near_limit: bool = False  # 80% or more