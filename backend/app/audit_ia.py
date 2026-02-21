from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models
from typing import List, Dict

def analyze_entries(db: Session, company_id: int) -> Dict:
    """
    AuditIA: Performs a full certification check.
    Returns: {
        "status": "GREEN" | "ORANGE" | "RED",
        "score": int,
        "checks": List[Dict],
        "anomalies": List[Dict]
    }
    """
    anomalies = []
    checks = []
    score = 100
    status = "GREEN"

    # --- 1. ENTRY LEVEL CHECKS (Anomalies) ---
    entries = db.query(models.Entry).join(models.Journal).filter(
        models.Journal.company_id == company_id
    ).all()

    for entry in entries:
        # Rule: Missing Labels
        if not entry.label or len(entry.label) < 3:
            anomalies.append({
                "entry_id": entry.id,
                "date": entry.date.isoformat() if entry.date else None,
                "type": "MISSING_CONTEXT",
                "severity": "MEDIUM",
                "description": f"Libellé absent ou trop court ('{entry.label}')."
            })

        # Rule: Suspicious Round Numbers (> 5000 and % 1000 == 0)
        for line in entry.lines:
            amount = line.debit if line.debit > 0 else line.credit
            if amount > 5000 and amount % 1000 == 0:
                anomalies.append({
                    "entry_id": entry.id,
                    "date": entry.date.isoformat() if entry.date else None,
                    "type": "SUSPICIOUS_ROUND",
                    "severity": "LOW",
                    "description": f"Montant rond ({amount}) sur le compte {line.account.code if line.account else '?'}. Vérifiez la pièce."
                })

    # --- 2. GLOBAL CHECKS (Certification) ---

    # Check A: General Balance (Debit = Credit)
    total_debit = db.query(func.sum(models.EntryLine.debit)).join(
        models.Entry, models.Entry.id == models.EntryLine.entry_id
    ).join(
        models.Journal, models.Journal.id == models.Entry.journal_id
    ).filter(
        models.Journal.company_id == company_id
    ).scalar() or 0

    total_credit = db.query(func.sum(models.EntryLine.credit)).join(
        models.Entry, models.Entry.id == models.EntryLine.entry_id
    ).join(
        models.Journal, models.Journal.id == models.Entry.journal_id
    ).filter(
        models.Journal.company_id == company_id
    ).scalar() or 0

    diff = round(abs(float(total_debit) - float(total_credit)), 2)
    if diff > 0.01:
        checks.append({"name": "Équilibre Général", "status": "KO", "message": f"Déséquilibre de {diff} FCFA"})
        score -= 50
        status = "RED"
    else:
        checks.append({"name": "Équilibre Général", "status": "OK", "message": "Balance équilibrée"})

    # Check B: Negative Cash Accounts (Caisse créditrice) - Class 5
    cash_accounts = db.query(models.Account).filter(
        models.Account.company_id == company_id,
        models.Account.code.like("5%")
    ).all()

    negative_cash_found = False
    for acc in cash_accounts:
        debit = db.query(func.sum(models.EntryLine.debit)).filter(
            models.EntryLine.account_id == acc.id
        ).scalar() or 0
        credit = db.query(func.sum(models.EntryLine.credit)).filter(
            models.EntryLine.account_id == acc.id
        ).scalar() or 0
        balance = float(debit) - float(credit)

        if balance < -100:  # Tolerance
            checks.append({"name": f"Trésorerie ({acc.code})", "status": "WARNING", "message": f"Solde négatif : {round(balance, 2)}"})
            negative_cash_found = True

    if negative_cash_found:
        score -= 15
        if status != "RED":
            status = "ORANGE"
    else:
        checks.append({"name": "Comptes de Trésorerie", "status": "OK", "message": "Aucun solde anormal"})

    # Check C: Volume (Empty ledger?)
    if len(entries) == 0:
        checks.append({"name": "Volume d'activité", "status": "KO", "message": "Aucune écriture trouvée"})
        status = "RED"
        score = 0
    else:
        checks.append({"name": "Volume d'activité", "status": "OK", "message": f"{len(entries)} écritures validées"})

    # Adjust Score based on anomalies count
    score -= len(anomalies) * 2
    score = max(0, score)  # No negative score

    # Final Status Logic override
    if score < 50:
        status = "RED"
    elif score < 80:
        status = "ORANGE"

    return {
        "status": status,
        "score": score,
        "checks": checks,
        "anomalies": anomalies
    }
