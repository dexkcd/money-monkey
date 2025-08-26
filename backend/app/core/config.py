from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://dev_user:dev_password@postgres:5432/expense_tracker"
    
    # OpenAI API
    openai_api_key: str = ""
    
    # Security
    secret_key: str = "your-secret-key-for-jwt-tokens"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Application
    environment: str = "development"
    debug: bool = True
    cors_origins: List[str] = ["http://localhost:3000"]
    
    # File Upload
    max_file_size: int = 10485760  # 10MB
    upload_dir: str = "uploads"
    allowed_file_types: List[str] = [
        "image/jpeg", 
        "image/png", 
        "image/gif", 
        "application/pdf"
    ]
    
    # Push Notifications
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:your-email@example.com"

    class Config:
        env_file = ".env"


settings = Settings()