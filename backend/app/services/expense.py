from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from fastapi import HTTPException, UploadFile
from datetime import date
from decimal import Decimal
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
    
    def get_expenses(
        self, 
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 100,
        category_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        search: Optional[str] = None,
        sort_by: str = "expense_date",
        sort_order: str = "desc"
    ) -> List[Expense]:
        """Get expenses for a user with filtering and sorting"""
        query = db.query(Expense).filter(Expense.user_id == user_id)
        
        # Apply filters
        if category_id is not None:
            query = query.filter(Expense.category_id == category_id)
        
        if start_date is not None:
            query = query.filter(Expense.expense_date >= start_date)
        
        if end_date is not None:
            query = query.filter(Expense.expense_date <= end_date)
        
        if min_amount is not None:
            query = query.filter(Expense.amount >= Decimal(str(min_amount)))
        
        if max_amount is not None:
            query = query.filter(Expense.amount <= Decimal(str(max_amount)))
        
        if search is not None:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Expense.description.ilike(search_term),
                    # Join with category to search category names too
                    Expense.category.has(Category.name.ilike(search_term))
                )
            )
        
        # Apply sorting
        sort_column = getattr(Expense, sort_by, Expense.expense_date)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
        
        return query.offset(skip).limit(limit).all()
    
    def get_expense(self, db: Session, expense_id: int, user_id: int) -> Optional[Expense]:
        """Get a specific expense by ID"""
        return db.query(Expense).filter(
            Expense.id == expense_id,
            Expense.user_id == user_id
        ).first()
    
    def create_expense(self, db: Session, expense: ExpenseCreate, user_id: int, auto_categorize: bool = False) -> Expense:
        """Create a new expense with optional AI categorization"""
        category_id = expense.category_id
        ai_confidence = None
        
        # If auto_categorize is requested and OpenAI is available, try to categorize
        if auto_categorize and self.openai_service and expense.description:
            try:
                suggested_category_name = self.openai_service.categorize_expense(
                    expense.description, expense.amount
                )
                
                # Find the suggested category
                suggested_category = db.query(Category).filter(
                    Category.name == suggested_category_name,
                    (Category.user_id == user_id) | (Category.is_default == True)
                ).first()
                
                if suggested_category:
                    category_id = suggested_category.id
                    ai_confidence = 0.8  # Set confidence for AI categorization
                    
            except Exception as e:
                # Log error but continue with provided category
                print(f"AI categorization failed: {e}")
        
        # Verify final category exists and belongs to user or is default
        category = db.query(Category).filter(
            Category.id == category_id,
            (Category.user_id == user_id) | (Category.is_default == True)
        ).first()
        
        if not category:
            raise HTTPException(status_code=400, detail="Invalid category")
        
        db_expense = Expense(
            user_id=user_id,
            amount=expense.amount,
            description=expense.description,
            category_id=category_id,
            expense_date=expense.expense_date,
            ai_confidence=ai_confidence
        )
        
        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        return db_expense
    
    def suggest_category(self, description: str, amount: Optional[float] = None) -> str:
        """Get AI-powered category suggestion for expense description"""
        if not self.openai_service:
            return "Other"
        
        try:
            amount_decimal = Decimal(str(amount)) if amount else None
            return self.openai_service.categorize_expense(description, amount_decimal)
        except Exception as e:
            print(f"Category suggestion failed: {e}")
            return "Other"
    
    def get_expense_stats(self, db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None) -> dict:
        """Get expense statistics for a user"""
        from sqlalchemy import func
        
        query = db.query(Expense).filter(Expense.user_id == user_id)
        
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)
        
        # Total expenses and count
        total_result = query.with_entities(
            func.sum(Expense.amount).label('total_amount'),
            func.count(Expense.id).label('total_count')
        ).first()
        
        total_amount = float(total_result.total_amount or 0)
        total_count = total_result.total_count or 0
        
        # Expenses by category
        category_stats = query.join(Category).with_entities(
            Category.name,
            func.sum(Expense.amount).label('amount'),
            func.count(Expense.id).label('count')
        ).group_by(Category.name).all()
        
        # Average expense amount
        avg_amount = total_amount / total_count if total_count > 0 else 0
        
        return {
            "total_amount": total_amount,
            "total_count": total_count,
            "average_amount": avg_amount,
            "by_category": [
                {
                    "category": stat.name,
                    "amount": float(stat.amount),
                    "count": stat.count,
                    "percentage": (float(stat.amount) / total_amount * 100) if total_amount > 0 else 0
                }
                for stat in category_stats
            ]
        }
    
    def update_expense(self, db: Session, expense_id: int, expense_update: ExpenseUpdate, user_id: int, auto_categorize: bool = False) -> Optional[Expense]:
        """Update an existing expense with optional AI categorization"""
        db_expense = self.get_expense(db, expense_id, user_id)
        if not db_expense:
            return None
        
        update_data = expense_update.dict(exclude_unset=True)
        
        # If auto_categorize is requested and description is being updated
        if auto_categorize and self.openai_service and 'description' in update_data:
            try:
                description = update_data.get('description', db_expense.description)
                amount = update_data.get('amount', db_expense.amount)
                
                suggested_category_name = self.openai_service.categorize_expense(description, amount)
                
                # Find the suggested category
                suggested_category = db.query(Category).filter(
                    Category.name == suggested_category_name,
                    (Category.user_id == user_id) | (Category.is_default == True)
                ).first()
                
                if suggested_category:
                    update_data['category_id'] = suggested_category.id
                    update_data['ai_confidence'] = 0.8
                    
            except Exception as e:
                print(f"AI categorization failed during update: {e}")
        
        # If category is being updated, verify it exists
        if 'category_id' in update_data:
            category = db.query(Category).filter(
                Category.id == update_data['category_id'],
                (Category.user_id == user_id) | (Category.is_default == True)
            ).first()
            
            if not category:
                raise HTTPException(status_code=400, detail="Invalid category")
        
        # Update fields
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
        
        # Validate extracted amount
        extracted_amount = processing_result.get('extracted_amount')
        if not extracted_amount or extracted_amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid or missing amount in receipt")
        
        # Find the suggested category
        suggested_category_name = processing_result.get('suggested_category', 'Other')
        category = db.query(Category).filter(
            Category.name == suggested_category_name,
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
        
        # Get expense date, default to today if not provided or invalid
        expense_date = processing_result.get('extracted_date')
        if not expense_date:
            expense_date = date.today()
        elif expense_date > date.today():
            # Don't allow future dates
            expense_date = date.today()
        
        # Create description from merchant or default
        description = processing_result.get('extracted_merchant')
        if not description or description.strip() == "":
            description = "Receipt upload"
        
        # Validate confidence score
        confidence_score = processing_result.get('confidence_score', 0.0)
        if confidence_score < 0.0 or confidence_score > 1.0:
            confidence_score = 0.0
        
        # Create expense with extracted data
        db_expense = Expense(
            user_id=user_id,
            amount=extracted_amount,
            description=description,
            category_id=category.id,
            expense_date=expense_date,
            receipt_url=file_url,
            ai_confidence=confidence_score
        )
        
        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        return db_expense