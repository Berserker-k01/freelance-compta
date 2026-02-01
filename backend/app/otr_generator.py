import pandas as pd
from sqlalchemy.orm import Session
from . import models
from fastapi.responses import FileResponse
import os

OUTPUT_DIR = "exports"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def generate_balance_sheet(db: Session, company_id: int):
    """
    Generates a simplified Balance Sheet Excel for OTR (GUDEF Test).
    Currently exports the Trial Balance (Balance des comptes).
    """
    # Query all accounts with their balances
    # Note: In a real world, we would aggregate EntryLines by Account
    query = db.query(
        models.Account.code, 
        models.Account.name,
        models.Account.class_code
    ).filter(models.Account.company_id == company_id)
    
    df = pd.read_sql(query.statement, db.bind)
    
    # Calculate balances (Mock logic for now as we need aggregation)
    # In V2 we will sum EntryLines linked to these accounts
    
    filename = f"Liasse_OTR_{company_id}.xlsx"
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    # Write to Excel
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Balance_Générale', index=False)
        # Create empty sheets for Bilan/CompteDeResultat to be filled by template
        pd.DataFrame().to_excel(writer, sheet_name='Bilan_Actif')
        pd.DataFrame().to_excel(writer, sheet_name='Bilan_Passif')
        pd.DataFrame().to_excel(writer, sheet_name='Compte_Resultat')
        
    return filepath
