from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import audit_ia
from ..database import get_db

router = APIRouter(
    prefix="/audit",
    tags=["audit"],
    responses={404: {"description": "Not found"}},
)

@router.get("/analyze/{company_id}")
def run_audit_analysis(company_id: int, db: Session = Depends(get_db)):
    """
    Launch AuditIA analysis on the company's ledger.
    Returns a list of detected anomalies.
    """
    return audit_ia.analyze_entries(db, company_id)
