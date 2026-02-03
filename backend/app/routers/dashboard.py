from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
from datetime import datetime, timedelta

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    responses={404: {"description": "Not found"}},
)

@router.get("/stats/{company_id}")
def get_dashboard_stats(company_id: int, db: Session = Depends(get_db)):
    """
    Get KPI and charts data for the dashboard.
    """
    now = datetime.utcnow()
    last_month = now - timedelta(days=30)
    
    # 1. Total Activity (Entries count)
    total_entries = db.query(models.Entry).join(models.Journal).filter(models.Journal.company_id == company_id).count()
    
    # 2. Cash Flow (Trésorerie) - Accounts Class 5
    # Sum of Debit - Credit for Class 5
    # Just an approximation: Balance of Class 5
    cash_accounts = db.query(models.Account.id).filter(models.Account.company_id == company_id, models.Account.class_code == 5).all()
    cash_account_ids = [acc.id for acc in cash_accounts]
    
    cash_balance = 0.0
    if cash_account_ids:
        kpi_cash = db.query(
            func.sum(models.EntryLine.debit),
            func.sum(models.EntryLine.credit)
        ).filter(models.EntryLine.account_id.in_(cash_account_ids)).first()
        
        if kpi_cash and kpi_cash[0] is not None:
             # Solde Trésorerie = Debit (Entrées) - Credit (Sorties) ? Or inverse depending on convention. 
             # For Assets (Class 5), Debit is increase.
             cash_balance = (kpi_cash[0] or 0) - (kpi_cash[1] or 0)

    # 3. Revenue vs Expenses (This Month)
    # Class 7 (Revenue) vs Class 6 (Expenses)
    revenue = 0.0
    expenses = 0.0
    
    # Get entries from last 30 days
    recent_lines = db.query(models.EntryLine).join(models.Entry).join(models.Account).filter(
        models.Entry.date >= last_month,
        models.Account.company_id == company_id
    ).all()
    
    for line in recent_lines:
        if line.account.class_code == 7: # Products (Credit = Gain)
            revenue += line.credit - line.debit
        elif line.account.class_code == 6: # Charges (Debit = Cost)
            expenses += line.debit - line.credit

    # 4. Recent Entries (Last 5)
    recent_entries = db.query(models.Entry).join(models.Journal).filter(models.Journal.company_id == company_id).order_by(models.Entry.date.desc()).limit(5).all()
    
    return {
        "kpi": {
            "total_entries": total_entries,
            "cash_balance": cash_balance,
            "revenue_month": revenue,
            "expenses_month": expenses
        },
        "recent_entries": [
            {
                "id": e.id,
                "date": e.date,
                "label": e.label,
                "journal": e.journal.code,
                "amount": sum(l.debit for l in e.lines) # Total movement
            } for e in recent_entries
        ],
        "chart_data": [
            # Dummy data for chart if not enough history
            {"name": "Jan", "solde": 4000},
            {"name": "Fev", "solde": 3000},
            {"name": "Mar", "solde": 2000},
            {"name": "Avr", "solde": 2780},
            {"name": "Mai", "solde": 1890},
            {"name": "Juin", "solde": 2390},
            {"name": "Juil", "solde": 3490},
        ]
    }
