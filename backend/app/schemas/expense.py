from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class ExpenseBase(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Expense amount must be positive")
    description: Optional[str] = Field(None, max_length=500)
    category_id: int = Field(..., description="Category ID is required")
    expense_date: date = Field(..., description="Expense date is required")


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = Field(None, max_length=500)
    category_id: Optional[int] = None
    expense_date: Optional[date] = None


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