from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..syscohada import seed_syscohada

router = APIRouter(
    prefix="/companies",
    tags=["companies"],
)

@router.post("/", response_model=schemas.Company)
def create_company(company: schemas.CompanyCreate, db: Session = Depends(get_db)):
    # Check tax_id uniqueness
    existing = db.query(models.Company).filter(models.Company.tax_id == company.tax_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un dossier avec ce NIF existe déjà.")

    db_company = models.Company(**company.model_dump())
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
def read_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Company).offset(skip).limit(limit).all()

@router.get("/{company_id}", response_model=schemas.Company)
def read_company(company_id: int, db: Session = Depends(get_db)):
    db_company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if db_company is None:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    return db_company

@router.put("/{company_id}", response_model=schemas.Company)
def update_company(company_id: int, company_update: schemas.CompanyCreate, db: Session = Depends(get_db)):
    db_company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    for key, value in company_update.model_dump().items():
        setattr(db_company, key, value)

    db.commit()
    db.refresh(db_company)
    return db_company

@router.delete("/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    db_company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    db.delete(db_company)
    db.commit()
    return {"status": "deleted", "message": f"Dossier '{db_company.name}' supprimé."}
