from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from datetime import date
from ...core.deps import get_db, get_current_user
from ...models.user import User
from ...schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, FileUploadResponse
from ...services.expense import ExpenseService

router = APIRouter()
expense_service = ExpenseService()


@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    start_date: Optional[date] = Query(None, description="Filter expenses from this date"),
    end_date: Optional[date] = Query(None, description="Filter expenses until this date"),
    min_amount: Optional[float] = Query(None, ge=0, description="Minimum expense amount"),
    max_amount: Optional[float] = Query(None, ge=0, description="Maximum expense amount"),
    search: Optional[str] = Query(None, max_length=100, description="Search in expense descriptions"),
    sort_by: Optional[str] = Query("expense_date", regex="^(expense_date|amount|created_at|description)$", description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get expenses for the current user with filtering and sorting options"""
    expenses = expense_service.get_expenses(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return expenses


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific expense by ID"""
    expense = expense_service.get_expense(db, expense_id, current_user.id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.post("/", response_model=ExpenseResponse)
def create_expense(
    expense: ExpenseCreate,
    auto_categorize: bool = Query(False, description="Use AI to automatically categorize the expense"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new expense with optional AI categorization"""
    print(f"DEBUG: create_expense endpoint called with data: {expense}")
    return expense_service.create_expense(db, expense, current_user.id, auto_categorize)


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_update: ExpenseUpdate,
    auto_categorize: bool = Query(False, description="Use AI to automatically categorize the expense"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing expense with optional AI categorization"""
    expense = expense_service.update_expense(db, expense_id, expense_update, current_user.id, auto_categorize)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an expense"""
    success = expense_service.delete_expense(db, expense_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}


@router.post("/upload", response_model=FileUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a receipt file and process it with AI
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    return await expense_service.upload_receipt(db, file, current_user.id)


@router.post("/from-receipt", response_model=ExpenseResponse)
def create_expense_from_receipt(
    file_url: str = Form(...),
    extracted_amount: float = Form(None),
    extracted_date: str = Form(None),
    extracted_merchant: str = Form(None),
    suggested_category: str = Form(...),
    confidence_score: float = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create an expense from processed receipt data
    """
    print(f"DEBUG: create_expense_from_receipt endpoint called with file_url: {file_url}")
    print(f"DEBUG: suggested_category: {suggested_category}, confidence_score: {confidence_score}")
    from datetime import datetime
    from decimal import Decimal
    
    # Build processing result dict
    processing_result = {
        'extracted_amount': Decimal(str(extracted_amount)) if extracted_amount else None,
        'extracted_date': datetime.strptime(extracted_date, '%Y-%m-%d').date() if extracted_date else None,
        'extracted_merchant': extracted_merchant,
        'suggested_category': suggested_category,
        'confidence_score': confidence_score
    }
    
    return expense_service.create_expense_from_receipt(
        db, current_user.id, file_url, processing_result
    )


@router.post("/categorize")
def suggest_category(
    description: str = Form(...),
    amount: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI-powered category suggestion for an expense description
    """
    suggestion = expense_service.suggest_category(description, amount)
    return {"suggested_category": suggestion}


@router.get("/stats")
def get_expense_stats(
    start_date: Optional[date] = Query(None, description="Start date for statistics"),
    end_date: Optional[date] = Query(None, description="End date for statistics"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get expense statistics for the current user
    """
    stats = expense_service.get_expense_stats(db, current_user.id, start_date, end_date)
    return stats