from sqlalchemy.orm import Session
from . import models
from typing import List, Dict

def analyze_entries(db: Session, company_id: int) -> List[Dict]:
    """
    AuditIA: Scans ledger entries for potential anomalies.
    
    Rules currently implemented:
    1. SUSPICIOUS_ROUND_NUMBER: Amounts ending perfectly in 000 (often estimates/fraud).
    2. MISSING_LABEL: Entries with generic or empty labels.
    """
    anomalies = []
    
    # Get all entries for the company (via journals)
    entries = db.query(models.Entry).join(models.Journal).filter(models.Journal.company_id == company_id).all()
    
    for entry in entries:
        # Rule 1: Check for missing or too short labels
        if not entry.label or len(entry.label) < 3:
            anomalies.append({
                "entry_id": entry.id,
                "date": entry.date,
                "type": "MISSING_CONTEXT",
                "severity": "MEDIUM",
                "description": f"Libellé absent ou trop court ('{entry.label}'). Une description précise est requise."
            })
            
        for line in entry.lines:
            amount = line.debit if line.debit > 0 else line.credit
            
            # Rule 2: Suspicious Round Numbers (e.g. 500000)
            # Logic: If > 1000 and perfectly divisible by 1000
            if amount > 1000 and amount % 1000 == 0:
                anomalies.append({
                    "entry_id": entry.id,
                    "date": entry.date,
                    "type": "SUSPICIOUS_ROUND_AMOUNT",
                    "severity": "LOW",
                    "description": f"Montant rond détecté ({amount}). Les vraies factures ont souvent des décimales ou ne sont pas si rondes."
                })
                
    return anomalies
