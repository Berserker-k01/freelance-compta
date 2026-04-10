"""
Contrôles métier reproductibles après chargement des soldes et injection.

Objectifs:
- Vérifier la cohérence comptable (équilibre débit/crédit, somme des soldes nets).
- Résumer la trace d'injection (règles sans match, volumétrie des rattachements).
"""
from __future__ import annotations

from typing import Any


def compute_post_injection_controls(
    *,
    balances: dict[str, float],
    raw: dict[str, tuple[float, float]],
    trace: list[dict],
    mapping_warnings: list[str],
    mapping_errors: list[str],
) -> dict[str, Any]:
    total_debit = sum(v[0] for v in raw.values()) if raw else 0.0
    total_credit = sum(v[1] for v in raw.values()) if raw else 0.0
    diff_gl = abs(total_debit - total_credit)
    net_sum = sum(balances.values()) if balances else 0.0

    # Numeric cell with zero matched accounts → rule pointed at no balance line.
    zero_match_trace = [
        t.get("cell_ref")
        for t in trace
        if t.get("matched_accounts_count", -1) == 0
        and isinstance(t.get("value"), (int, float))
    ]
    heavy_match = [
        t.get("cell_ref")
        for t in trace
        if isinstance(t.get("matched_accounts_count"), int) and t["matched_accounts_count"] > 80
    ]

    return {
        "general_ledger": {
            "total_debit": round(total_debit, 2),
            "total_credit": round(total_credit, 2),
            "difference": round(diff_gl, 2),
            "balanced": diff_gl < 1.0,
        },
        "net_balances": {
            "sum": round(net_sum, 2),
            "closure_ok": abs(net_sum) < 1.0,
        },
        "compte_13": _extract_class_summary(balances, prefix="13"),
        "trace_review": {
            "cells_numeric_zero_match": zero_match_trace[:50],
            "cells_high_account_count": heavy_match[:30],
            "injection_row_count": len(trace),
        },
        "mapping": {
            "warnings_distinct": len(set(mapping_warnings or [])),
            "errors_distinct": len(set(mapping_errors or [])),
        },
    }


def _extract_class_summary(balances: dict[str, float], prefix: str) -> dict[str, Any]:
    total = 0.0
    codes: list[str] = []
    for code, bal in balances.items():
        if code.startswith(prefix):
            total += bal
            codes.append(code)
    return {
        "present": bool(codes),
        "codes_count": len(codes),
        "net_sum": round(total, 2),
    }
