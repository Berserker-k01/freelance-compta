from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from .. import otr_generator
from ..database import get_db

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
)

@router.get("/otr/{company_id}")
def download_liasse_otr(company_id: int, db: Session = Depends(get_db)):
    """Generate and download the OTR tax bundle (Excel)."""
    file_path = otr_generator.generate_balance_sheet(db, company_id)
    return FileResponse(path=file_path, filename=f"Liasse_OTR_Auditia.xlsx", media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
