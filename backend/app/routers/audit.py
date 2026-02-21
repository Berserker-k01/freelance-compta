from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Literal
from .. import audit_ia, models
from ..database import get_db

router = APIRouter(
    prefix="/audit",
    tags=["audit"],
    responses={404: {"description": "Not found"}},
)


@router.get("/analyze/{company_id}")
def run_audit_analysis(company_id: int, db: Session = Depends(get_db)):
    """
    Launch AuditIA analysis on the company's ledger.
    Returns anomalies, coherence checks and a global score.
    """
    return audit_ia.analyze_entries(db, company_id)


# ---------------------------------------------------------------------------
# COHERENCE CHECKS
# Contrôles de cohérence conformes aux 3 règles OTR
# ---------------------------------------------------------------------------

def _get_balances(db: Session, company_id: int) -> dict[str, float]:
    """Return { account_code: debit - credit } for a company."""
    rows = (
        db.query(
            models.Account.code,
            func.sum(models.EntryLine.debit).label("debit"),
            func.sum(models.EntryLine.credit).label("credit"),
        )
        .join(models.EntryLine, models.EntryLine.account_id == models.Account.id)
        .join(models.Entry, models.Entry.id == models.EntryLine.entry_id)
        .filter(models.Account.company_id == company_id)
        .group_by(models.Account.code)
        .all()
    )
    return {r.code: float(r.debit or 0) - float(r.credit or 0) for r in rows}


def _sum_prefix(balances: dict, *prefixes: str, negate: bool = False) -> float:
    """Sum all balances whose key starts with any of the given prefixes."""
    total = sum(
        v for k, v in balances.items()
        if any(k.startswith(p) for p in prefixes)
    )
    return -total if negate else total


def _check(
    name: str,
    passed: bool,
    detail_ok: str,
    detail_fail: str,
    values: dict | None = None,
) -> dict:
    return {
        "name": name,
        "status": "OK" if passed else "KO",
        "message": detail_ok if passed else detail_fail,
        "values": values or {},
    }


@router.get("/coherence/{company_id}")
def run_coherence_checks(company_id: int, db: Session = Depends(get_db)):
    """
    Exécute les 3 contrôles de cohérence OTR :
      1. Total Actif Net = Total Passif
      2. Résultat Net (Bilan) = Résultat Net (Compte de Résultat)
      3. Trésorerie nette cohérente (Actif - Passif courant BQ)
    """
    b = _get_balances(db, company_id)

    if not b:
        return {
            "checks": [],
            "warning": "Aucune écriture comptable trouvée pour cette société."
        }

    # ---- 1. TOTAL ACTIF NET = TOTAL PASSIF --------------------------------
    # Actif brut = Classe 2 (actif immob.) + Classe 3 (stocks) + Classe 4 déb. + Classe 5 déb.
    actif_brut = _sum_prefix(b, "2", "3") + sum(
        v for k, v in b.items()
        if (k.startswith("4") or k.startswith("5")) and v > 0
    )
    # Amortissements & provisions = comptes 28x, 29x, 39x, 49x (créditeurs → négatifs en D-C)
    amort = _sum_prefix(b, "28", "29", "39", "49")  # négatifs normalement
    actif_net = actif_brut + amort  # amort < 0 donc soustrait bien

    # Passif = Capitaux propres (1) + Dettes (16, 17) + Passif circulant (4 créd.) + BQ passif (56)
    passif = (
        _sum_prefix(b, "1", "16", "17", negate=True)
        + sum(-v for k, v in b.items()
              if (k.startswith("4") or k.startswith("56")) and v < 0)
    )

    ecart_bilan = round(actif_net - passif, 2)
    check1 = _check(
        name="Équilibre du Bilan (Actif Net = Passif)",
        passed=abs(ecart_bilan) < 1.0,
        detail_ok=f"Le bilan est équilibré. Actif Net ≈ Passif ({round(actif_net, 2):,.0f} FCFA).",
        detail_fail=f"Déséquilibre de {ecart_bilan:,.2f} FCFA. Vérifiez les écritures de clôture.",
        values={"actif_net": round(actif_net, 2), "passif": round(passif, 2), "ecart": ecart_bilan},
    )

    # ---- 2. RÉSULTAT NET BILAN = RÉSULTAT NET COMPTE DE RÉSULTAT ----------
    # Résultat bilan = Compte 13 (négatif si bénéfice car créditeur)
    res_bilan = _sum_prefix(b, "13", negate=True)

    # Résultat CR = Produits (Classe 7 + 73 + 74 + 75 + 77 + 78 + 85~88) - Charges (Classe 6 + 67 + 68 + 81~84 + 89)
    produits = _sum_prefix(b, "7", "8", negate=True)  # créditeurs → negate
    charges  = _sum_prefix(b, "6", "81", "82", "83", "84", "89")  # débiteurs
    res_cr = produits - charges

    ecart_res = round(res_bilan - res_cr, 2)
    check2 = _check(
        name="Cohérence Résultat (Bilan ↔ Compte de Résultat)",
        passed=abs(ecart_res) < 1.0,
        detail_ok=f"Le résultat est cohérent ({round(res_bilan, 2):,.0f} FCFA) entre le bilan et le compte de résultat.",
        detail_fail=(
            f"Le résultat du bilan ({round(res_bilan, 2):,.0f} FCFA) diffère du résultat du CR "
            f"({round(res_cr, 2):,.0f} FCFA). Écart : {ecart_res:,.2f} FCFA. "
            "Vérifiez l'affectation du résultat (compte 13) et les écritures de clôture."
        ),
        values={"resultat_bilan": round(res_bilan, 2), "resultat_cr": round(res_cr, 2), "ecart": ecart_res},
    )

    # ---- 3. TRÉSORERIE NETTE (Actif - Concours bancaires) -----------------
    # Trésorerie active : 52 (Banques), 53 (Chèques postaux), 57 (Caisse), 58 (Équiv. tréso)
    tresorerie_active = _sum_prefix(b, "52", "53", "57", "58")

    # Trésorerie passive : 56 (Crédits de trésorerie, découverts)
    tresorerie_passive = _sum_prefix(b, "56", negate=True)  # créditeur → negate → positif

    tresorerie_nette = round(tresorerie_active - tresorerie_passive, 2)

    # Contrôle : la trésorerie nette doit être de signe cohérent (un découvert global est un signal)
    check3 = _check(
        name="Trésorerie Nette (Comptes 52+57 − Concours 56)",
        passed=True,  # Informatif : on signale juste la valeur, pas d'erreur bloquante
        detail_ok=(
            f"Trésorerie nette : {tresorerie_nette:,.0f} FCFA "
            f"(Actif BQ/Caisse : {tresorerie_active:,.0f} | Découverts : {tresorerie_passive:,.0f}). "
            + ("⚠ Situation de découvert net." if tresorerie_nette < 0 else "Situation créditrice.")
        ),
        detail_fail="",
        values={
            "tresorerie_active": round(tresorerie_active, 2),
            "tresorerie_passive": round(tresorerie_passive, 2),
            "tresorerie_nette": tresorerie_nette,
        },
    )
    # Downgrade to WARNING if overdraft
    if tresorerie_nette < 0:
        check3["status"] = "WARNING"

    checks = [check1, check2, check3]
    nb_ko = sum(1 for c in checks if c["status"] == "KO")
    nb_warn = sum(1 for c in checks if c["status"] == "WARNING")

    return {
        "company_id": company_id,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        "summary": {
            "total": len(checks),
            "ok": len(checks) - nb_ko - nb_warn,
            "warnings": nb_warn,
            "errors": nb_ko,
        },
        "checks": checks,
    }
