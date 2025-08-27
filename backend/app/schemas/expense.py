from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class ExpenseBase(BaseModel):
    amount: Decimal = Field(..., gt=0, le=999999.99, description="Expense amount must be positive and less than $1,000,000")
    description: Optional[str] = Field(None, max_length=500, description="Optional expense description")
    category_id: int = Field(..., gt=0, description="Category ID is required and must be positive")
    expense_date: date = Field(..., description="Expense date is required")
    
    @validator('description')
    def validate_description(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) == 0:
                return None
        return v
    
    @validator('expense_date')
    def validate_expense_date(cls, v):
        if v > date.today():
            raise ValueError('Expense date cannot be in the future')
        # Don't allow expenses older than 10 years
        from datetime import timedelta
        ten_years_ago = date.today() - timedelta(days=365 * 10)
        if v < ten_years_ago:
            raise ValueError('Expense date cannot be more than 10 years ago')
        return v


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, le=999999.99, description="Expense amount must be positive and less than $1,000,000")
    description: Optional[str] = Field(None, max_length=500, description="Optional expense description")
    category_id: Optional[int] = Field(None, gt=0, description="Category ID must be positive")
    expense_date: Optional[date] = None
    
    @validator('description')
    def validate_description(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) == 0:
                return None
        return v
    
    @validator('expense_date')
    def validate_expense_date(cls, v):
        if v is not None:
            if v > date.today():
                raise ValueError('Expense date cannot be in the future')
            # Don't allow expenses older than 10 years
            from datetime import timedelta
            ten_years_ago = date.today() - timedelta(days=365 * 10)
            if v < ten_years_ago:
                raise ValueError('Expense date cannot be more than 10 years ago')
        return v


class ExpenseResponse(ExpenseBase):
    id: int
    user_id: int
    receipt_url: Optional[str] = None
    ai_confidence: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReceiptProcessingResult(BaseModel):
    raw_text: str
    extracted_amount: Optional[Decimal] = None
    extracted_date: Optional[date] = None
    extracted_merchant: Optional[str] = None
    suggested_category: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)


class FileUploadResponse(BaseModel):
    filename: str
    file_url: str
    file_size: int
    content_type: str
    processing_result: Optional[ReceiptProcessingResult] = None