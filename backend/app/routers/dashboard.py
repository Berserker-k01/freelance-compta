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

    # 1. Total Activity (Entries count) - filter by company via journal
    total_entries = db.query(models.Entry).join(models.Journal).filter(
        models.Journal.company_id == company_id
    ).count()

    # 2. Cash Flow (Trésorerie) - Class 5
    cash_accounts = db.query(models.Account.id).filter(
        models.Account.company_id == company_id,
        models.Account.class_code == 5
    ).all()
    cash_account_ids = [acc.id for acc in cash_accounts]

    cash_balance = 0.0
    if cash_account_ids:
        kpi_cash = db.query(
            func.sum(models.EntryLine.debit),
            func.sum(models.EntryLine.credit)
        ).filter(models.EntryLine.account_id.in_(cash_account_ids)).first()

        if kpi_cash and kpi_cash[0] is not None:
            cash_balance = float(kpi_cash[0] or 0) - float(kpi_cash[1] or 0)

    # 3. Revenue vs Expenses (Last 30 days) - using aggregation, not lazy loading
    revenue_data = db.query(
        func.sum(models.EntryLine.credit) - func.sum(models.EntryLine.debit)
    ).join(
        models.Entry, models.Entry.id == models.EntryLine.entry_id
    ).join(
        models.Account, models.Account.id == models.EntryLine.account_id
    ).filter(
        models.Entry.date >= last_month,
        models.Account.company_id == company_id,
        models.Account.class_code == 7
    ).scalar() or 0.0

    expenses_data = db.query(
        func.sum(models.EntryLine.debit) - func.sum(models.EntryLine.credit)
    ).join(
        models.Entry, models.Entry.id == models.EntryLine.entry_id
    ).join(
        models.Account, models.Account.id == models.EntryLine.account_id
    ).filter(
        models.Entry.date >= last_month,
        models.Account.company_id == company_id,
        models.Account.class_code == 6
    ).scalar() or 0.0

    # 4. Recent Entries (Last 5)
    recent_entries = db.query(models.Entry).join(models.Journal).filter(
        models.Journal.company_id == company_id
    ).order_by(models.Entry.date.desc()).limit(5).all()

    # 5. Real monthly chart data - last 7 months
    MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    chart_data = []
    for i in range(6, -1, -1):
        month_date = now - timedelta(days=30 * i)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        month_cash = db.query(
            func.sum(models.EntryLine.debit) - func.sum(models.EntryLine.credit)
        ).join(
            models.Entry, models.Entry.id == models.EntryLine.entry_id
        ).join(
            models.Account, models.Account.id == models.EntryLine.account_id
        ).filter(
            models.Entry.date >= month_start,
            models.Entry.date < month_end,
            models.Account.company_id == company_id,
            models.Account.class_code == 5
        ).scalar() or 0.0

        chart_data.append({
            "name": MONTH_NAMES[month_date.month - 1],
            "solde": round(float(month_cash), 2)
        })

    return {
        "kpi": {
            "total_entries": total_entries,
            "cash_balance": round(float(cash_balance), 2),
            "revenue_month": round(float(revenue_data), 2),
            "expenses_month": round(float(expenses_data), 2)
        },
        "recent_entries": [
            {
                "id": e.id,
                "date": e.date.isoformat() if e.date else None,
                "label": e.label,
                "journal": e.journal.code if e.journal else "OD",
                "amount": round(sum(l.debit for l in e.lines), 2)
            } for e in recent_entries
        ],
        "chart_data": chart_data
    }
