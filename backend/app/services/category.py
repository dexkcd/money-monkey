from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from ..models.category import Category
from ..schemas.category import CategoryCreate, CategoryUpdate
from fastapi import HTTPException, status


class CategoryService:
    """Service class for category-related operations."""
    
    @staticmethod
    def get_categories(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Category]:
        """Get all categories available to a user (default + user-specific)."""
        return db.query(Category).filter(
            or_(
                Category.is_default == True,
                Category.user_id == user_id
            )
        ).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_category_count(db: Session, user_id: int) -> int:
        """Get total count of categories available to a user."""
        return db.query(Category).filter(
            or_(
                Category.is_default == True,
                Category.user_id == user_id
            )
        ).count()
    
    @staticmethod
    def get_category_by_id(db: Session, category_id: int, user_id: int) -> Optional[Category]:
        """Get a specific category by ID if accessible to the user."""
        return db.query(Category).filter(
            Category.id == category_id,
            or_(
                Category.is_default == True,
                Category.user_id == user_id
            )
        ).first()
    
    @staticmethod
    def get_category_by_name(db: Session, name: str, user_id: int) -> Optional[Category]:
        """Get a category by name if accessible to the user."""
        return db.query(Category).filter(
            Category.name.ilike(name),
            or_(
                Category.is_default == True,
                Category.user_id == user_id
            )
        ).first()
    
    @staticmethod
    def create_category(db: Session, category: CategoryCreate, user_id: int) -> Category:
        """Create a new user-specific category."""
        # Check if category name already exists for this user
        existing = CategoryService.get_category_by_name(db, category.name, user_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{category.name}' already exists"
            )
        
        db_category = Category(
            name=category.name,
            color=category.color,
            is_default=False,
            user_id=user_id
        )
        db.add(db_category)
        db.commit()
        db.refresh(db_category)
        return db_category
    
    @staticmethod
    def update_category(db: Session, category_id: int, category_update: CategoryUpdate, user_id: int) -> Category:
        """Update a user-specific category."""
        # Get the category
        db_category = CategoryService.get_category_by_id(db, category_id, user_id)
        if not db_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Check if it's a default category (cannot be modified)
        if db_category.is_default:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot modify default categories"
            )
        
        # Check if it belongs to the user
        if db_category.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot modify categories that don't belong to you"
            )
        
        # Check for name conflicts if name is being updated
        if category_update.name and category_update.name != db_category.name:
            existing = CategoryService.get_category_by_name(db, category_update.name, user_id)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Category '{category_update.name}' already exists"
                )
        
        # Update fields
        update_data = category_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_category, field, value)
        
        db.commit()
        db.refresh(db_category)
        return db_category
    
    @staticmethod
    def delete_category(db: Session, category_id: int, user_id: int) -> bool:
        """Delete a user-specific category."""
        # Get the category
        db_category = CategoryService.get_category_by_id(db, category_id, user_id)
        if not db_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Check if it's a default category (cannot be deleted)
        if db_category.is_default:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete default categories"
            )
        
        # Check if it belongs to the user
        if db_category.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete categories that don't belong to you"
            )
        
        # Check if category is being used by expenses or budgets
        if db_category.expenses or db_category.budgets:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete category that is being used by expenses or budgets"
            )
        
        db.delete(db_category)
        db.commit()
        return True
    
    @staticmethod
    def get_default_categories(db: Session) -> List[Category]:
        """Get all default categories."""
        return db.query(Category).filter(Category.is_default == True).all()
    
    @staticmethod
    def get_user_categories(db: Session, user_id: int) -> List[Category]:
        """Get user-specific categories only."""
        return db.query(Category).filter(Category.user_id == user_id).all()