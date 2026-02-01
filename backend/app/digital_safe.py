from fastapi import UploadFile
import shutil
import os
from pathlib import Path
import uuid

UPLOAD_DIR = Path("uploads/safe")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def save_upload_file(upload_file: UploadFile, company_id: int) -> str:
    """Save an uploaded file to the digital safe and return its path."""
    # Create company specific folder
    company_dir = UPLOAD_DIR / str(company_id)
    company_dir.mkdir(exist_ok=True)
    
    # Generate unique filename to prevent collisions
    extension = os.path.splitext(upload_file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{extension}"
    file_path = company_dir / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
        
    return str(file_path)

def get_file_path(filename: str, company_id: int) -> Path:
    return UPLOAD_DIR / str(company_id) / filename
