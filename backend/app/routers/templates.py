from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Company, Entry, EntryLine, Account
import pandas as pd
import shutil
import os
from datetime import datetime

router = APIRouter(
    prefix="/templates",
    tags=["templates"],
    responses={404: {"description": "Not found"}},
)

# Robust path finding: 
# This file is in backend/app/routers/
# We want to reach backend/templates/
# So we go up 3 levels from here.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEMPLATE_PATH = os.path.join(BASE_DIR, "templates", "syscohada_template.xlsx")
OUTPUT_DIR = os.path.join(BASE_DIR, "temp_exports")

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

@router.get("/generate/{company_id}")
async def generate_liasse(company_id: int, document_id: int = None, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # 1. Fetch Accounting Data (General Balance)
    # We aggregate all lines by account
    accounts = db.query(Account).filter(Account.company_id == company_id).all()
    
    balance_data = []
    
    for acc in accounts:
        # Calculate debit/credit sum for this account
        query = db.query(EntryLine).join(Entry).filter(EntryLine.account_id == acc.id)
        
        if document_id:
            query = query.filter(Entry.document_id == document_id)
            
        lines = query.all()
        debit_sum = sum(l.debit for l in lines)
        credit_sum = sum(l.credit for l in lines)
        
        if debit_sum == 0 and credit_sum == 0:
            continue

        balance = debit_sum - credit_sum
        solde_debit = balance if balance > 0 else 0
        solde_credit = abs(balance) if balance < 0 else 0

        balance_data.append({
            "Numéro de Compte": acc.code,
            "Intitulé de Compte": acc.name,
            "Mvt Débit": debit_sum,
            "Mvt Crédit": credit_sum,
            "Solde Débit": solde_debit,
            "Solde Crédit": solde_credit
        })

    # 2. Process Excel
    suffix = f"_DOC{document_id}" if document_id else ""
    output_filename = f"Liasse_{company.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d%H%M')}{suffix}.xlsx"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    
    try:
        # Copy template
        shutil.copy(TEMPLATE_PATH, output_path)
        
        if balance_data:
            with pd.ExcelWriter(output_path, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
                df = pd.DataFrame(balance_data)
                df.to_excel(writer, sheet_name="Balance (Optionnel)", index=False, header=True)
                
    except Exception as e:
        print(f"Error generating Excel: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return FileResponse(output_path, filename=output_filename, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@router.get("/generate-smt/{company_id}")
async def generate_smt(company_id: int, document_id: int = None, db: Session = Depends(get_db)):
    # SMT uses the same logic for this MVP
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    # 1. Fetch Data
    accounts = db.query(Account).filter(Account.company_id == company_id).all()
    balance_data = []
    
    for acc in accounts:
        query = db.query(EntryLine).join(Entry).filter(EntryLine.account_id == acc.id)
        if document_id:
             query = query.filter(Entry.document_id == document_id)
             
        lines = query.all()
        debit_sum = sum(l.debit for l in lines)
        credit_sum = sum(l.credit for l in lines)
        if debit_sum == 0 and credit_sum == 0: continue
        balance = debit_sum - credit_sum
        balance_data.append({
            "Numéro de Compte": acc.code,
            "Intitulé de Compte": acc.name,
            "Mvt Débit": debit_sum,
            "Mvt Crédit": credit_sum,
            "Solde Débit": balance if balance > 0 else 0,
            "Solde Crédit": abs(balance) if balance < 0 else 0
        })

    # 2. Process
    suffix = f"_DOC{document_id}" if document_id else ""
    output_filename = f"SMT_{company.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d%H%M')}{suffix}.xlsx"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    
    try:
        shutil.copy(TEMPLATE_PATH, output_path)
        if balance_data:
            with pd.ExcelWriter(output_path, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
                pd.DataFrame(balance_data).to_excel(writer, sheet_name="Balance (Optionnel)", index=False, header=True)
    except Exception as e:
        print(f"Error SMT: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return FileResponse(output_path, filename=output_filename, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
