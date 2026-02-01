from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, crud, models
from ..database import get_db
from ..syscohada import seed_syscohada

router = APIRouter(
    prefix="/accounting",
    tags=["accounting"],
    responses={404: {"description": "Not found"}},
)

# --- ACCOUNTS ---
@router.post("/accounts/", response_model=schemas.Account)
def create_account(account: schemas.AccountCreate, company_id: int, db: Session = Depends(get_db)):
    return crud.create_account(db=db, account=account, company_id=company_id)

@router.get("/accounts/{company_id}", response_model=List[schemas.Account])
def read_accounts(company_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    accounts = crud.get_accounts(db, company_id=company_id, skip=skip, limit=limit)
    return accounts

@router.post("/accounts/seed/{company_id}")
def seed_default_plan(company_id: int, db: Session = Depends(get_db)):
    """Initialize SYSCOHADA plan for a company"""
    return seed_syscohada(db, company_id)

# --- ENTRIES ---
@router.post("/entries/", response_model=schemas.Entry)
def create_entry_transaction(entry: schemas.EntryCreate, db: Session = Depends(get_db)):
    # Validate Debit = Credit
    total_debit = sum(line.debit for line in entry.lines)
    total_credit = sum(line.credit for line in entry.lines)
    
    if round(total_debit, 2) != round(total_credit, 2):
        raise HTTPException(status_code=400, detail=f"Unbalanced Entry: Debit ({total_debit}) != Credit ({total_credit})")
        
    return crud.create_entry(db=db, entry=entry)

@router.get("/entries/", response_model=List[schemas.Entry])
def read_entries(journal_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_entries(db, journal_id=journal_id, skip=skip, limit=limit)
