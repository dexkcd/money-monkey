import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ...core.deps import get_db, get_current_user
from ...models.user import User
from ...core.config import settings

router = APIRouter()


@router.get("/{user_id}/{filename}")
def serve_file(
    user_id: int,
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Serve uploaded files (with basic access control)
    """
    # Basic access control - users can only access their own files
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Construct file path
    file_path = Path(settings.upload_dir) / str(user_id) / filename
    
    # Check if file exists
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security check - ensure file is within upload directory
    try:
        file_path.resolve().relative_to(Path(settings.upload_dir).resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type='application/octet-stream'
    )