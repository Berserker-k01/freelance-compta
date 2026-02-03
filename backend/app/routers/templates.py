from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
from pathlib import Path
import json

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/templates",
    tags=["templates"],
)

TEMPLATE_DIR = Path("/app/templates_storage") # Mounted volume

@router.on_event("startup")
async def ensure_template_dir():
    TEMPLATE_DIR.mkdir(exist_ok=True, parents=True)

@router.post("/", response_model=schemas.Template)
def create_template(
    name: str = Form(...),
    country: str = Form(...),
    year: int = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a new Excel Template."""
    # 1. Save File
    file_ext = os.path.splitext(file.filename)[1]
    if file_ext not in [".xlsx", ".xls"]:
        raise HTTPException(400, "Only Excel files are allowed.")
        
    safe_filename = f"{country}_{year}_{name.replace(' ', '_')}{file_ext}"
    file_path = TEMPLATE_DIR / safe_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 2. Save DB Record
    db_template = models.ReportTemplate(
        name=name,
        country=country,
        year=year,
        description=description,
        file_path=str(file_path),
        mapping_config="{}" # Empty by default, configured later
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    return db_template

@router.get("/", response_model=List[schemas.Template])
def read_templates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.ReportTemplate).offset(skip).limit(limit).all()

@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(models.ReportTemplate).filter(models.ReportTemplate.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")
        
    # Delete from Disk
    try:
        if os.path.exists(template.file_path):
            os.remove(template.file_path)
    except Exception as e:
        print(f"Error deleting file: {e}")

    # Delete from DB
    db.delete(template)
    db.commit()
    return {"status": "deleted"}
