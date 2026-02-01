from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import digital_safe, models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/safe",
    tags=["digital_safe"],
    responses={404: {"description": "Not found"}},
)

@router.post("/upload/{company_id}")
def upload_document(company_id: int, file: UploadFile = File(...)):
    """Upload a document to the digital safe."""
    try:
        file_path = digital_safe.save_upload_file(file, company_id)
        return {"filename": file.filename, "path": file_path, "status": "securely stored"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
