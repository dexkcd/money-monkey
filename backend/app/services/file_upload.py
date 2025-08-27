import os
import uuid
import shutil
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException
from ..core.config import settings


class FileUploadService:
    def __init__(self):
        self.upload_dir = Path(settings.upload_dir)
        self.max_file_size = settings.max_file_size
        self.allowed_types = settings.allowed_file_types
        
        # Create upload directory if it doesn't exist
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file type and size"""
        if file.content_type not in self.allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file.content_type} not allowed. "
                       f"Allowed types: {', '.join(self.allowed_types)}"
            )
        
        # Check file size (FastAPI doesn't provide size directly, so we'll check during save)
        if hasattr(file, 'size') and file.size > self.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum allowed size of {self.max_file_size} bytes"
            )
    
    def generate_filename(self, original_filename: str) -> str:
        """Generate unique filename while preserving extension"""
        file_extension = Path(original_filename).suffix.lower()
        unique_id = str(uuid.uuid4())
        return f"{unique_id}{file_extension}"
    
    async def save_file(self, file: UploadFile, user_id: int) -> Tuple[str, str, int]:
        """
        Save uploaded file to disk
        Returns: (filename, file_path, file_size)
        """
        self.validate_file(file)
        
        # Create user-specific directory
        user_dir = self.upload_dir / str(user_id)
        user_dir.mkdir(exist_ok=True)
        
        # Generate unique filename
        filename = self.generate_filename(file.filename or "upload")
        file_path = user_dir / filename
        
        # Save file and track size
        file_size = 0
        try:
            with open(file_path, "wb") as buffer:
                while chunk := await file.read(8192):  # Read in 8KB chunks
                    file_size += len(chunk)
                    if file_size > self.max_file_size:
                        # Clean up partial file
                        os.unlink(file_path)
                        raise HTTPException(
                            status_code=400,
                            detail=f"File size exceeds maximum allowed size of {self.max_file_size} bytes"
                        )
                    buffer.write(chunk)
        except Exception as e:
            # Clean up on error
            if file_path.exists():
                os.unlink(file_path)
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
        return filename, str(file_path), file_size
    
    def delete_file(self, file_path: str) -> bool:
        """Delete file from disk"""
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
                return True
            return False
        except Exception:
            return False
    
    def get_file_url(self, filename: str, user_id: int) -> str:
        """Generate URL for accessing uploaded file"""
        return f"/api/v1/files/{user_id}/{filename}"