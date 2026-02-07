from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
from datetime import datetime

from .. import schemas, crud, models
from ..database import get_db

router = APIRouter(
    prefix="/documents",
    tags=["documents"],
    responses={404: {"description": "Not found"}},
)

BASE_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")

if not os.path.exists(BASE_UPLOAD_DIR):
    os.makedirs(BASE_UPLOAD_DIR)

@router.post("/upload/{company_id}", response_model=schemas.Document)
async def upload_document(
    company_id: int, 
    file: UploadFile = File(...), 
    name: str = None, # Optional display name
    file_type: str = "other",
    db: Session = Depends(get_db)
):
    # Ensure company upload dir exists
    company_dir = os.path.join(BASE_UPLOAD_DIR, str(company_id))
    if not os.path.exists(company_dir):
        os.makedirs(company_dir)
    
    # Generate safe filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(company_dir, safe_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create DB record
    db_doc = models.Document(
        name=name or file.filename,
        filename=safe_filename,
        file_path=file_path,
        file_type=file_type,
        company_id=company_id
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    return db_doc

@router.get("/list/{company_id}", response_model=List[schemas.Document])
def list_documents(company_id: int, db: Session = Depends(get_db)):
    return db.query(models.Document).filter(models.Document.company_id == company_id).order_by(models.Document.created_at.desc()).all()

@router.get("/download/{document_id}")
def download_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    return FileResponse(doc.file_path, filename=doc.filename)

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete physical file
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
        
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
