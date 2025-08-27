from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from ..models.expense import Expense
from ..models.category import Category
from ..schemas.expense import ExpenseCreate, ExpenseUpdate, FileUploadResponse
from .file_upload import FileUploadService
from .openai_service import OpenAIService


class ExpenseService:
    def __init__(self):
        self.file_service = FileUploadService()
        try:
            self.openai_service = OpenAIService()
        except (ValueError, Exception) as e:
            # OpenAI service not available, will handle gracefully
            print(f"OpenAI service not available: {e}")
            self.openai_service = None
    
    def get_expenses(self, db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Expense]:
        """Get all expenses for a user"""
        return db.query(Expense).filter(
            Expense.user_id == user_id
        ).offset(skip).limit(limit).all()
    
    def get_expense(self, db: Session, expense_id: int, user_id: int) -> Optional[Expense]:
        """Get a specific expense by ID"""
        return db.query(Expense).filter(
            Expense.id == expense_id,
            Expense.user_id == user_id
        ).first()
    
    def create_expense(self, db: Session, expense: ExpenseCreate, user_id: int) -> Expense:
        """Create a new expense"""
        # Verify category exists and belongs to user or is default
        category = db.query(Category).filter(
            Category.id == expense.category_id,
            (Category.user_id == user_id) | (Category.is_default == True)
        ).first()
        
        if not category:
            raise HTTPException(status_code=400, detail="Invalid category")
        
        db_expense = Expense(
            user_id=user_id,
            amount=expense.amount,
            description=expense.description,
            category_id=expense.category_id,
            expense_date=expense.expense_date
        )
        
        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        return db_expense
    
    def update_expense(self, db: Session, expense_id: int, expense_update: ExpenseUpdate, user_id: int) -> Optional[Expense]:
        """Update an existing expense"""
        db_expense = self.get_expense(db, expense_id, user_id)
        if not db_expense:
            return None
        
        # If category is being updated, verify it exists
        if expense_update.category_id is not None:
            category = db.query(Category).filter(
                Category.id == expense_update.category_id,
                (Category.user_id == user_id) | (Category.is_default == True)
            ).first()
            
            if not category:
                raise HTTPException(status_code=400, detail="Invalid category")
        
        # Update fields
        update_data = expense_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_expense, field, value)
        
        db.commit()
        db.refresh(db_expense)
        return db_expense
    
    def delete_expense(self, db: Session, expense_id: int, user_id: int) -> bool:
        """Delete an expense"""
        db_expense = self.get_expense(db, expense_id, user_id)
        if not db_expense:
            return False
        
        # Delete associated file if exists
        if db_expense.receipt_url:
            # Extract file path from URL and delete
            # This is a simplified approach - in production you'd want more robust file management
            pass
        
        db.delete(db_expense)
        db.commit()
        return True
    
    async def upload_receipt(self, db: Session, file: UploadFile, user_id: int) -> FileUploadResponse:
        """
        Upload receipt file and process it with OpenAI
        """
        # Save the file
        filename, file_path, file_size = await self.file_service.save_file(file, user_id)
        file_url = self.file_service.get_file_url(filename, user_id)
        
        # Process with OpenAI if available
        processing_result = None
        if self.openai_service and file.content_type:
            try:
                processing_result = self.openai_service.extract_receipt_data(file_path, file.content_type)
            except Exception as e:
                # Log error but don't fail the upload
                print(f"OpenAI processing failed: {e}")
        
        return FileUploadResponse(
            filename=filename,
            file_url=file_url,
            file_size=file_size,
            content_type=file.content_type or "application/octet-stream",
            processing_result=processing_result
        )
    
    def create_expense_from_receipt(
        self, 
        db: Session, 
        user_id: int, 
        file_url: str,
        processing_result: Optional[dict] = None
    ) -> Expense:
        """
        Create an expense from processed receipt data
        """
        if not processing_result:
            raise HTTPException(status_code=400, detail="No processing result provided")
        
        # Find the suggested category
        category = db.query(Category).filter(
            Category.name == processing_result.get('suggested_category', 'Other'),
            (Category.user_id == user_id) | (Category.is_default == True)
        ).first()
        
        if not category:
            # Fallback to "Other" category
            category = db.query(Category).filter(
                Category.name == "Other",
                Category.is_default == True
            ).first()
        
        if not category:
            raise HTTPException(status_code=500, detail="No default category found")
        
        # Create expense with extracted data
        db_expense = Expense(
            user_id=user_id,
            amount=processing_result.get('extracted_amount') or 0,
            description=processing_result.get('extracted_merchant') or "Receipt upload",
            category_id=category.id,
            expense_date=processing_result.get('extracted_date') or db.execute("SELECT CURRENT_DATE").scalar(),
            receipt_url=file_url,
            ai_confidence=processing_result.get('confidence_score')
        )
        
        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        return db_expense