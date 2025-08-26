from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import os
from .core.config import settings
from .core.database import engine
from .models import Base

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


@app.get("/")
def read_root():
    return {
        "message": "Expense Tracker API",
        "version": "1.0.0",
        "environment": settings.environment
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "environment": settings.environment
    }