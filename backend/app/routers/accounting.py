from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io
import math
import os
import shutil
from datetime import datetime

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
def read_accounts(company_id: int, skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    # Increased limit for full plan
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
    
    if abs(total_debit - total_credit) > 0.05: # Allow small float error
        raise HTTPException(status_code=400, detail=f"Unbalanced Entry: Debit ({total_debit}) != Credit ({total_credit})")
        
    return crud.create_entry(db=db, entry=entry)

@router.get("/entries/", response_model=List[schemas.Entry])
def read_entries(journal_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_entries(db, journal_id=journal_id, skip=skip, limit=limit)

# --- IMPORT BALANCE ---
@router.post("/import-balance/{company_id}")
async def import_balance(company_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Import a General Balance from Excel/CSV to populate accounts and create an opening entry (AN).
    ALSO: Saves the file to the Document Storage.
    """
    # 1. Save File
    BASE_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    if not os.path.exists(BASE_UPLOAD_DIR):
        os.makedirs(BASE_UPLOAD_DIR)

    company_dir = os.path.join(BASE_UPLOAD_DIR, str(company_id))
    if not os.path.exists(company_dir):
        os.makedirs(company_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(company_dir, safe_filename)
    
    # Read content once into memory for processing AND saving
    contents = await file.read()
    
    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    # 2. Create Document Record
    db_doc = models.Document(
        name=f"Balance Import {datetime.now().strftime('%d/%m/%Y')}",
        filename=safe_filename,
        file_path=file_path,
        file_type="balance",
        company_id=company_id
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents), header=None)
        else:
            df = pd.read_excel(io.BytesIO(contents), header=None)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid file format: {str(e)}")

    # Header Detection Strategy
    # We read with header=None to capture the first row.
    # 1. Check if first row contains 'compte' or 'account'
    first_row = df.iloc[0].astype(str).str.lower().tolist()
    has_headers = any(k in first_row for k in ['compte', 'account', 'numero', 'numéro'])
    
    if has_headers:
        # Promote row 0 to header
        df.columns = first_row
        df = df[1:].reset_index(drop=True)
    else:
        # No headers found (e.g. raw data "101000...")
        # Fallback to column index based on shape
        # 6-col balance: 0=Account, 1=Label, 4=Debit, 5=Credit (Solde)
        # 8-col balance: 0=Account, 1=Label, 6=Debit, 7=Credit (Solde)
        num_cols = df.shape[1]
        
        # Create standard headers
        new_cols = [f"col_{i}" for i in range(num_cols)]
        if num_cols >= 6:
            new_cols[0] = 'account'
            new_cols[1] = 'label'
            
            if num_cols == 8:
                new_cols[6] = 'solde_debit'
                new_cols[7] = 'solde_credit'
            elif num_cols == 6:
                # Assuming standard 6 col: Compte, Label, DebMvt, CredMvt, SoldeDeb, SoldeCred
                new_cols[4] = 'solde_debit'
                new_cols[5] = 'solde_credit'
            else:
                 # Try 6/7 rule if plenty of cols
                 if num_cols >= 8:
                     new_cols[6] = 'solde_debit'
                     new_cols[7] = 'solde_credit'
                 
        df.columns = new_cols

    # Normalize columns (again, just in case)
    df.columns = [str(c).strip().lower() for c in df.columns]
    
    # Column Mapping Strategy
    col_map = {}
    possible_account = ['compte', 'numéro', 'account', 'numero']
    possible_label = ['intitulé', 'libellé', 'label', 'description', 'libelle']
    possible_debit = ['débit', 'debit', 'solde_debit']
    possible_credit = ['crédit', 'credit', 'solde_credit']
    possible_balance = ['solde', 'balance']

    for col in df.columns:
        if any(x in col for x in possible_account) and 'account' not in col_map: col_map['account'] = col
        if any(x in col for x in possible_label) and 'label' not in col_map: col_map['label'] = col
        if any(x in col for x in possible_debit) and 'debit' not in col_map: col_map['debit'] = col
        if any(x in col for x in possible_credit) and 'credit' not in col_map: col_map['credit'] = col
        if any(x in col for x in possible_balance) and 'balance' not in col_map: col_map['balance'] = col

    if 'account' not in col_map:
        raise HTTPException(status_code=400, detail="Colonne 'Compte' introuvable.")

    # Prepare for Entry Creation
    # Ensure Default Journal Exists (ID 1)
    default_journal = db.query(models.Journal).filter(models.Journal.id == 1).first()
    if not default_journal:
        # Create default journal "Opérations Diverses" if missing
        default_journal = models.Journal(
            id=1,
            code="OD", 
            name="Opérations Diverses", 
            company_id=company_id
        )
        db.add(default_journal)
        db.commit()
    
    entry_lines = []
    
    # existing accounts cache
    existing_accounts = {acc.code: acc for acc in crud.get_accounts(db, company_id, limit=5000)}
    
    for _, row in df.iterrows():
        # Get raw values
        code_raw = str(row[col_map['account']]).split('.')[0].strip() # Remove decimals if any
        if not code_raw or code_raw == 'nan': continue
        
        label = row[col_map['label']] if 'label' in col_map else "Solde Initial"
        if pd.isna(label): label = "Solde Initial"
        
        # Calculate amount
        debit = 0.0
        credit = 0.0
        
        if 'debit' in col_map and 'credit' in col_map:
            d_val = row[col_map['debit']]
            c_val = row[col_map['credit']]
            debit = float(d_val) if pd.notnull(d_val) else 0.0
            credit = float(c_val) if pd.notnull(c_val) else 0.0
        elif 'balance' in col_map:
            bal = float(row[col_map['balance']]) if pd.notnull(row[col_map['balance']]) else 0.0
            if bal > 0:
                debit = bal
            else:
                credit = abs(bal)
        
        if debit == 0 and credit == 0:
            continue

        # Find or Create Account
        if code_raw not in existing_accounts:
            # Create on the fly
            try:
                class_code = int(code_raw[0])
            except:
                class_code = 0
                
            new_acc = schemas.AccountCreate(code=code_raw, name=str(label)[:100], class_code=class_code)
            db_acc = crud.create_account(db, new_acc, company_id)
            existing_accounts[code_raw] = db_acc
        
        account_id = existing_accounts[code_raw].id
        
        entry_lines.append(schemas.EntryLineCreate(
            account_id=account_id,
            debit=debit,
            credit=credit,
            label=str(label)[:100]
        ))

    if not entry_lines:
        raise HTTPException(status_code=400, detail="Aucune donnée comptable valide trouvée.")

    # Create the Entry
    # We might need to split into chunks if too large, but for MVP one big entry is fine.
    
    # Calculate Balance
    total_d = sum(l.debit for l in entry_lines)
    total_c = sum(l.credit for l in entry_lines)
    
    # Auto-balance if needed (e.g., Resultat) - Optional, for now we let it fail or warn.
    # User requested "Import Balance", usually these are balanced.
    
    entry_data = schemas.EntryCreate(
        company_id=company_id,
        journal_id=1, # Default Journal
        date=datetime.now(), # Use current date or file date
        reference="IMPORT-BAL",
        label=f"Import Balance Excel - {file.filename}",
        document_id=db_doc.id,
        lines=entry_lines
    )
    
    try:
        if abs(total_d - total_c) > 0.05:
            # Create a balancing line? No, better to warn.
            # But usually we import 'Errors' to a waiting account (471)
            pass 
            
        new_entry = crud.create_entry(db, entry_data)
        return {"message": "Success", "entries_count": len(entry_lines), "total_debit": total_d}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
