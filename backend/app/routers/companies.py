from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, models_user
from ..database import get_db
from ..auth_utils import get_current_user
from ..syscohada import seed_syscohada

router = APIRouter(
    prefix="/companies",
    tags=["companies"],
)

@router.post("/", response_model=schemas.Company)
def create_company(company: schemas.CompanyCreate, db: Session = Depends(get_db), current_user: models_user.User = Depends(get_current_user)):
    # Check tax_id uniqueness
    existing = db.query(models.Company).filter(models.Company.tax_id == company.tax_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un dossier avec ce NIF existe déjà.")

    db_company = models.Company(**company.model_dump(), user_id=current_user.id)
    db.add(db_company)
    db.commit()
    db.refresh(db_company)

    # Auto-create default journals for new company
    default_journals = [
        models.Journal(code="OD",  name="Opérations Diverses",  company_id=db_company.id),
        models.Journal(code="ACH", name="Journal des Achats",    company_id=db_company.id),
        models.Journal(code="VTE", name="Journal des Ventes",    company_id=db_company.id),
        models.Journal(code="BQ",  name="Banque",                company_id=db_company.id),
        models.Journal(code="CAI", name="Caisse",                company_id=db_company.id),
    ]
    for j in default_journals:
        db.add(j)

    # Auto-seed SYSCOHADA plan comptable
    db.commit()
    try:
        seed_syscohada(db, db_company.id)
    except Exception as e:
        # Non-blocking if seed fails (e.g. already seeded)
        print(f"[companies] seed_syscohada warning: {e}")

    db.refresh(db_company)
    return db_company

@router.get("/", response_model=List[schemas.Company])
def read_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models_user.User = Depends(get_current_user)):
    return db.query(models.Company).filter(models.Company.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/{company_id}", response_model=schemas.Company)
def read_company(company_id: str, db: Session = Depends(get_db), current_user: models_user.User = Depends(get_current_user)):
    db_company = db.query(models.Company).filter(models.Company.id == company_id, models.Company.user_id == current_user.id).first()
    if db_company is None:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    return db_company

@router.put("/{company_id}", response_model=schemas.Company)
def update_company(company_id: str, company_update: schemas.CompanyCreate, db: Session = Depends(get_db), current_user: models_user.User = Depends(get_current_user)):
    db_company = db.query(models.Company).filter(models.Company.id == company_id, models.Company.user_id == current_user.id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    for key, value in company_update.model_dump().items():
        setattr(db_company, key, value)

    db.commit()
    db.refresh(db_company)
    return db_company

@router.delete("/{company_id}")
def delete_company(company_id: str, db: Session = Depends(get_db), current_user: models_user.User = Depends(get_current_user)):
    db_company = db.query(models.Company).filter(models.Company.id == company_id, models.Company.user_id == current_user.id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    db.delete(db_company)
    db.commit()
    return {"status": "deleted", "message": f"Dossier '{db_company.name}' supprimé."}

# --- ANNEXES DA/TA (EXTRA-ACCOUNTING) ---

@router.get("/{company_id}/annexes")
def get_company_annexes(company_id: str, db: Session = Depends(get_db), current_user: models_user.User = Depends(get_current_user)):
    """Retrieve extra-accounting data (Annexes) for a company."""
    db_company = db.query(models.Company).filter(models.Company.id == company_id, models.Company.user_id == current_user.id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    annexe = db.query(models.AnnexeData).filter(models.AnnexeData.company_id == company_id).first()
    import json
    if not annexe:
        return {}
    try:
        return json.loads(annexe.data)
    except:
        return {}

from pydantic import BaseModel
class AnnexePayload(BaseModel):
    data: dict

@router.put("/{company_id}/annexes")
def update_company_annexes(company_id: str, payload: AnnexePayload, db: Session = Depends(get_db), current_user: models_user.User = Depends(get_current_user)):
    """Update or create extra-accounting data (Annexes) for a company."""
    import json
    db_company = db.query(models.Company).filter(models.Company.id == company_id, models.Company.user_id == current_user.id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    annexe = db.query(models.AnnexeData).filter(models.AnnexeData.company_id == company_id).first()
    if not annexe:
        annexe = models.AnnexeData(company_id=company_id, data=json.dumps(payload.data))
        db.add(annexe)
    else:
        annexe.data = json.dumps(payload.data)

    db.commit()
    return {"message": "Données extra-comptables mises à jour avec succès"}
