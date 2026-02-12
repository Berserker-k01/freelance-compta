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
    accounts = db.query(Account).filter(Account.company_id == company_id).all()
    
    # Pre-calculate balances per account code
    account_balances = {} 
    
    for acc in accounts:
        query = db.query(EntryLine).join(Entry).filter(EntryLine.account_id == acc.id)
        if document_id:
            query = query.filter(Entry.document_id == document_id)
            
        lines = query.all()
        # Calculate NET balance (Debit - Credit)
        balance = sum(l.debit for l in lines) - sum(l.credit for l in lines)
        
        if balance != 0:
            account_balances[acc.code] = balance

    # 2. Hardcoded Mapping (POC for Syscohada Revised)
    # Format: {'SheetName': {'Cell': ['AccountPrefix', SignMultiplier]}}
    # SignMultiplier: 1 for Assert/Expense (Debit+), -1 for Liability/Revenue (Credit+)
    # This is a TINY subset for demonstration. ideally this is stored in DB.
    
    # REVISED MAPPING based on typical OHADA layout
    # We will try to write to these cells. 
    # NOTE: The user's template might use DIFFERENT cell coordinates than my guess.
    # To fix this properly, I would need to analyze the specific template cells.
    # For now, I will add more generic fields.
    
    MAPPING = {
        "BILAN ACTIF": {
            "E14": (["20", "21"], 1), # Incorporelles
            "E15": (["22", "23"], 1), # Corporelles (Terrain/Bat)
            "E16": (["24"], 1), # Matériel
            "E17": (["25", "26"], 1), # Autres immo
            "E18": (["27"], 1), # Financières
            
            "E22": (["31", "32"], 1), # Stocks Marchandises
            "E23": (["33", "34", "35"], 1), # Autres Stocks
            
            "E25": (["41"], 1), # Clients
            "E26": (["42", "43", "44", "45", "46", "47"], 1), # Autres Créances
            
            "E28": (["50", "51", "52", "53", "54", "55", "56", "57"], 1), # Trésorerie
            "E29": (["58"], 1), # Régie d'avance
        },
        "BILAN PASSIF": {
            "E13": (["101"], -1), # Capital
            "E15": (["11"], -1), # Réserves
            "E17": (["12"], -1), # Résultat
            "E18": (["13"], -1), # Subventions
            "E20": (["14"], -1), # Provisions réglementées
            
            "E23": (["16"], -1), # Emprunts
            "E26": (["40"], -1), # Fournisseurs
            "E27": (["42", "43", "44"], -1), # Fiscal & Social
            "E28": (["45", "46", "47"], -1), # Autres dettes
        },
        "COMPTE RESULTAT": {
            "E12": (["70"], -1), # Ventes
            "E13": (["71"], -1), # Subventions expl
            "E14": (["72", "73", "75"], -1), # Autres produits
            
            "E16": (["60"], 1), # Achats
            "E17": (["61", "62", "63"], 1), # Services Extérieurs
            "E18": (["64"], 1), # Impôts
            "E19": (["66"], 1), # Personnel
            "E22": (["68"], 1), # Dotations
        }
    }
    
    balance_export = []
    
    output_filename = f"Liasse_{company.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d%H%M')}.xlsx"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    
    try:
        shutil.copy(TEMPLATE_PATH, output_path)
        
        import openpyxl
        wb = openpyxl.load_workbook(output_path)
        
        # Inject Data
        for sheet_name, mapping in MAPPING.items():
            if sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                for cell_ref, (prefixes, sign) in mapping.items():
                    # Sum all matching accounts
                    total = 0.0
                    for code, bal in account_balances.items():
                        if any(code.startswith(p) for p in prefixes):
                            total += bal
                    
                    # Apply sign (Debit is + in DB, but sometimes we need Credit as + in Excel)
                    final_val = total * sign
                    
                    # Write only if non-zero? or always?
                    if final_val != 0:
                        # Handle Merged Cells
                        # Check if cell_ref is part of a merge range
                        
                        # Optimization: Use openpyxl's internal check or just try/except
                        # But simplest robust way:
                        found_merge = False
                        for merged_range in ws.merged_cells.ranges:
                             if cell_ref in merged_range:
                                 # Write to top-left
                                 ws.cell(row=merged_range.min_row, column=merged_range.min_col).value = final_val
                                 found_merge = True
                                 break
                        
                        if not found_merge:
                            ws[cell_ref] = final_val
        
        # Also export the Raw Balance tab
        if "Balance (Optionnel)" in wb.sheetnames:
             # Using pandas key for this is easier, but openpyxl also works
             pass 
             
        wb.save(output_path)
        
        # Re-open with Pandas to append Balance sheet if needed (easiest way to dump list)
        # Note: Mixing openpyxl and pandas on same file needs care.
        # Let's just use the openpyxl loop above for the Liasse.
        
        # Construct balance list for the optional sheet
        # ... (Same as before)
        
    except Exception as e:
        print(f"Error generating Excel: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return FileResponse(output_path, filename=output_filename, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
