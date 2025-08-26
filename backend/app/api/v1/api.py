from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .categories import router as categories_router


api_router = APIRouter()

# Include authentication routes
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])

# Include user routes
api_router.include_router(users_router, prefix="/users", tags=["users"])

# Include category routes
api_router.include_router(categories_router, prefix="/categories", tags=["categories"])