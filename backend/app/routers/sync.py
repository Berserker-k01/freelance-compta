from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..auth_utils import get_current_user
from ..models import Company, Document, Account
from ..models_user import User
from pydantic import BaseModel

router = APIRouter(prefix="/sync", tags=["Synchronization"])

class SyncData(BaseModel):
    companies: List[dict]
    documents: List[dict]
    accounts: List[dict]

@router.get("/export")
def export_user_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Export all data belonging to the current user into a single JSON object.
    """
    companies = db.query(Company).filter(Company.user_id == current_user.id).all()
    company_ids = [c.id for c in companies]
    
    docs = db.query(Document).filter(Document.company_id.in_(company_ids)).all() if company_ids else []
    accs = db.query(Account).filter(Account.company_id.in_(company_ids)).all() if company_ids else []
    
    return {
        "user_email": current_user.email,
        "exported_at": datetime.utcnow().isoformat(),
        "data": {
            "companies": [c.__dict__ for c in companies],
            "documents": [d.__dict__ for d in docs],
            "accounts": [a.__dict__ for a in accs]
        }
    }

@router.post("/import")
def import_user_data(payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Import/Merge data into the current user's account.
    This is used for Cloud Synchronization.
    """
    data = payload.get("data", {})
    companies_data = data.get("companies", [])
    
    # Simplified Merge Logic: Add new ones, update existing by Name/TaxID
    for c_data in companies_data:
        # Remove primary key and internal fields
        c_id = c_data.pop("id", None)
        c_data.pop("user_id", None)
        c_data.pop("_sa_instance_state", None)
        
        existing = db.query(Company).filter(
            Company.user_id == current_user.id,
            Company.name == c_data["name"]
        ).first()
        
        if existing:
            for key, value in c_data.items():
                setattr(existing, key, value)
        else:
            new_comp = Company(**c_data, user_id=current_user.id)
            db.add(new_comp)
    
    db.commit()
    return {"message": "Synchronisation réussie", "timestamp": datetime.utcnow().isoformat()}
