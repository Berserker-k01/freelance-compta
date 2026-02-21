from sqlalchemy.orm import Session
from . import models, schemas

# --- ACCOUNTS ---
def get_account(db: Session, account_id: int):
    return db.query(models.Account).filter(models.Account.id == account_id).first()

def get_accounts(db: Session, company_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Account).filter(models.Account.company_id == company_id).offset(skip).limit(limit).all()

def create_account(db: Session, account: schemas.AccountCreate, company_id: int):
    db_account = models.Account(**account.model_dump(), company_id=company_id)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

# --- ENTRIES ---
def create_entry(db: Session, entry: schemas.EntryCreate):
    # Create Header
    db_entry = models.Entry(
        date=entry.date,
        reference=entry.reference,
        label=entry.label,
        journal_id=entry.journal_id,
        document_id=entry.document_id, # Add this
        validated=False
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    # Create Lines
    for line in entry.lines:
        db_line = models.EntryLine(
            entry_id=db_entry.id,
            account_id=line.account_id,
            debit=line.debit,
            credit=line.credit,
            label=line.label or entry.label # Default to header label if empty
        )
        db.add(db_line)
    
    db.commit()
    db.refresh(db_entry)
    return db_entry

def get_entries(db: Session, journal_id: int = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Entry)
    if journal_id:
        query = query.filter(models.Entry.journal_id == journal_id)
    return query.offset(skip).limit(limit).all()
