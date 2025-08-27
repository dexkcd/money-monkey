from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .categories import router as categories_router
from .expenses import router as expenses_router
from .files import router as files_router


api_router = APIRouter()

# Include authentication routes
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])

# Include user routes
api_router.include_router(users_router, prefix="/users", tags=["users"])

# Include category routes
api_router.include_router(categories_router, prefix="/categories", tags=["categories"])

# Include expense routes
api_router.include_router(expenses_router, prefix="/expenses", tags=["expenses"])

# Include file serving routes
api_router.include_router(files_router, prefix="/files", tags=["files"])