from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import os
import time
import logging
from .core.config import settings
from .core.database import engine
from .models import Base
from .api.v1.api import api_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database tables are managed by Alembic migrations
# Base.metadata.create_all(bind=engine)

# Create FastAPI application
app = FastAPI(
    title="Expense Tracker API",
    description="AI-powered expense tracking and budget management system",
    version="1.0.0",
    debug=settings.debug
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Add trusted host middleware for security
if settings.environment == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure with actual domains in production
    )

# Create upload directory if it doesn't exist
os.makedirs(settings.upload_dir, exist_ok=True)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s")
    return response

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.get("/")
def read_root():
    return {
        "message": "Expense Tracker API",
        "version": "1.0.0",
        "environment": settings.environment
    }


@app.get("/health")
def health_check():
    """Comprehensive health check for production monitoring."""
    from .core.database import get_db
    from .models import Category
    import psutil
    import datetime
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "environment": settings.environment,
        "version": "1.0.0"
    }
    
    # Database health check
    try:
        db = next(get_db())
        db.query(Category).count()
        health_status["database"] = "connected"
        db.close()
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # System resource check
    try:
        health_status["system"] = {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent
        }
    except Exception:
        # psutil might not be available in all environments
        health_status["system"] = "unavailable"
    
    # OpenAI API check (basic)
    health_status["openai_configured"] = bool(settings.openai_api_key)
    
    # Upload directory check
    health_status["upload_dir"] = {
        "exists": os.path.exists(settings.upload_dir),
        "writable": os.access(settings.upload_dir, os.W_OK) if os.path.exists(settings.upload_dir) else False
    }
    
    return health_status


@app.get("/db-test")
def database_test():
    """Test database connection and models."""
    from .core.database import get_db
    from .models import Category
    
    db = next(get_db())
    try:
        # Test database connection by counting categories
        category_count = db.query(Category).count()
        default_categories = db.query(Category).filter(Category.is_default == True).count()
        
        return {
            "status": "success",
            "total_categories": category_count,
            "default_categories": default_categories,
            "database_url": settings.database_url.split("@")[1] if "@" in settings.database_url else "hidden"
        }
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        db.close()