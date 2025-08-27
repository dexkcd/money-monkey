from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ...core.deps import get_db, get_current_user
from ...models.user import User
from ...schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, FileUploadResponse
from ...services.expense import ExpenseService

router = APIRouter()
expense_service = ExpenseService()


@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all expenses for the current user"""
    expenses = expense_service.get_expenses(db, current_user.id, skip, limit)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new expense"""
    return expense_service.create_expense(db, expense, current_user.id)


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_update: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing expense"""
    expense = expense_service.update_expense(db, expense_id, expense_update, current_user.id)
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