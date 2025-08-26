from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from ...core.deps import get_db, get_current_user
from ...models.user import User
from ...schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryListResponse
from ...services.category import CategoryService

router = APIRouter()


@router.get("/", response_model=CategoryListResponse)
def get_categories(
    skip: int = Query(0, ge=0, description="Number of categories to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of categories to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all categories available to the current user (default + user-specific).
    """
    categories = CategoryService.get_categories(db, current_user.id, skip, limit)
    total = CategoryService.get_category_count(db, current_user.id)
    
    return CategoryListResponse(
        categories=[CategoryResponse.from_orm(cat) for cat in categories],
        total=total
    )


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific category by ID.
    """
    category = CategoryService.get_category_by_id(db, category_id, current_user.id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return CategoryResponse.from_orm(category)


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new user-specific category.
    """
    db_category = CategoryService.create_category(db, category, current_user.id)
    return CategoryResponse.from_orm(db_category)


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_update: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a user-specific category.
    Cannot update default categories.
    """
    db_category = CategoryService.update_category(db, category_id, category_update, current_user.id)
    return CategoryResponse.from_orm(db_category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a user-specific category.
    Cannot delete default categories or categories that are in use.
    """
    CategoryService.delete_category(db, category_id, current_user.id)


@router.get("/default/list", response_model=List[CategoryResponse])
def get_default_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all default categories.
    """
    categories = CategoryService.get_default_categories(db)
    return [CategoryResponse.from_orm(cat) for cat in categories]


@router.get("/user/list", response_model=List[CategoryResponse])
def get_user_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user-specific categories only.
    """
    categories = CategoryService.get_user_categories(db, current_user.id)
    return [CategoryResponse.from_orm(cat) for cat in categories]