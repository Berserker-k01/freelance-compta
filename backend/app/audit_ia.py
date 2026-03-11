from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models
from typing import List, Dict

def analyze_entries(db: Session, company_id: str) -> Dict:
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

    # --- 1. GET ALL BALANCES FOR LOGICAL CHECKS ---
    balances = {}
    rows = (
        db.query(
            models.Account.code,
            models.Account.name,
            func.sum(models.EntryLine.debit).label("debit"),
            func.sum(models.EntryLine.credit).label("credit"),
        )
        .join(models.EntryLine, models.EntryLine.account_id == models.Account.id)
        .join(models.Entry, models.Entry.id == models.EntryLine.entry_id)
        .join(models.Journal, models.Journal.id == models.Entry.journal_id)
        .filter(models.Journal.company_id == company_id)
        .group_by(models.Account.code, models.Account.name)
        .all()
    )
    for r in rows:
        balances[r.code] = {
            "name": r.name,
            "debit": float(r.debit or 0),
            "credit": float(r.credit or 0),
            "net": float(r.debit or 0) - float(r.credit or 0)
        }
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

    # --- 2. ACCOUNT BALANCE ANOMALIES (SYSCOHADA LOGIC) ---
    for code, data in balances.items():
        net = data["net"]
        
        # Rule: Waiting accounts (471, 473) should be cleared
        if code.startswith("471") or code.startswith("473"):
            if abs(net) > 0.1:
                anomalies.append({
                    "entry_id": None,
                    "date": None,
                    "type": "WAITING_ACCOUNT_NOT_CLEARED",
                    "severity": "HIGH",
                    "description": f"Le compte d'attente {code} présente un solde de {net:,.2f}. Il doit être soldé en fin d'exercice."
                })
                score -= 10
                
        # Rule: Unnatural balances (Client Credit / Supplier Debit)
        # Client 411 should be debit (net > 0), Supplier 401 should be credit (net < 0)
        if code.startswith("411") and net < -0.1:
            anomalies.append({
                "entry_id": None,
                "date": None,
                "type": "UNNATURAL_BALANCE_CLIENT",
                "severity": "MEDIUM",
                "description": f"Le compte Client {code} est anormalement créditeur ({net:,.2f}). Peut-être une avance (419) ?"
            })
            score -= 5
            
        if code.startswith("401") and net > 0.1:
            anomalies.append({
                "entry_id": None,
                "date": None,
                "type": "UNNATURAL_BALANCE_SUPPLIER",
                "severity": "MEDIUM",
                "description": f"Le compte Fournisseur {code} est anormalement débiteur ({net:,.2f}). Peut-être une avance (409) ?"
            })
            score -= 5

    # --- 3. GLOBAL CHECKS (Certification) ---

    # Check A: General Balance (Debit = Credit)
    total_debit = sum(b["debit"] for b in balances.values())
    total_credit = sum(b["credit"] for b in balances.values())

    diff = round(abs(float(total_debit) - float(total_credit)), 2)
    if diff > 0.01:
        checks.append({"name": "Équilibre Général", "status": "KO", "message": f"Déséquilibre de {diff} FCFA"})
        score -= 50
        status = "RED"
    else:
        checks.append({"name": "Équilibre Général", "status": "OK", "message": "Balance équilibrée"})

    # Check B: Negative Cash Accounts (Caisse créditrice) - Class 5
    negative_cash_found = False
    for code, data in balances.items():
        if code.startswith("53") or code.startswith("57"): # Cash/Postal, not Bank (Banks can be negative/overdraft)
            if data["net"] < -100:  # Tolerance
                checks.append({"name": f"Trésorerie ({code})", "status": "WARNING", "message": f"Solde caisse anormalement négatif : {round(data['net'], 2)}"})
                negative_cash_found = True

    if negative_cash_found:
        score -= 20
        if status != "RED":
            status = "ORANGE"
    else:
        checks.append({"name": "Comptes de Trésorerie Caisse", "status": "OK", "message": "Aucun solde caisse négatif (Physiquement impossible)"})

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
