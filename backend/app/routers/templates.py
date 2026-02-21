from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Company, Account, EntryLine, Entry, Journal
from ..services.injector import ExcelInjector
import os
from datetime import datetime
from typing import Optional

router = APIRouter(
    prefix="/templates",
    tags=["templates"],
    responses={404: {"description": "Not found"}},
)

# Path resolution: this file is at backend/app/routers/templates.py
# BASE_DIR → backend/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEMPLATE_PATH = os.path.join(BASE_DIR, "templates", "syscohada_template.xlsx")
OUTPUT_DIR = os.path.join(BASE_DIR, "temp_exports")

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# ---------------------------------------------------------------------------
# TEMPLATE CRUD ENDPOINTS (BEFORE dynamic routes)
# ---------------------------------------------------------------------------

from .. import models
from typing import List

@router.get("/list")
def list_templates(db: Session = Depends(get_db)):
    """List all available report templates."""
    templates = db.query(models.ReportTemplate).all()
    return templates


# ---------------------------------------------------------------------------
# PREREQUISITE VALIDATION ENDPOINT
# ---------------------------------------------------------------------------

# Required Excel sheet names in the template
REQUIRED_SHEETS = ["BILAN ACTIF", "BILAN PASSIF", "COMPTE DE RESULTAT", "Résultat fiscal"]

# Account class prefixes that MUST be populated for a meaningful liasse
# { "label": ("prefix1", "prefix2", ...) }
REQUIRED_ACCOUNT_CLASSES = {
    "Comptes de Capitaux (Classe 1 — Capital, Réserves, Emprunts)": ("1",),
    "Stocks (Classe 3)": ("3",),
    "Comptes de Tiers (Classe 4 — Clients, Fournisseurs)": ("4",),
    "Trésorerie (Classe 5 — Banque, Caisse)": ("52", "53", "57"),
    "Charges d'Exploitation (Classe 6)": ("6",),
    "Produits d'Exploitation (Classe 7 — CA)": ("7",),
}


@router.get("/validate/{company_id}")
def validate_prerequisites(company_id: int, document_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Vérifie tous les prérequis avant de générer la liasse.
    Retourne :
      {
        "ready": bool,
        "blockers": [str],     # erreurs bloquantes
        "warnings": [str],     # avertissements non bloquants
        "checks": [            # détail de chaque contrôle
          { "name": str, "status": "OK"|"WARNING"|"KO", "detail": str }
        ]
      }
    """
    checks = []
    blockers = []
    warnings = []

    # ------------------------------------------------------------------ #
    # 1. La société existe                                                 #
    # ------------------------------------------------------------------ #
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return {
            "ready": False,
            "blockers": ["Société introuvable (ID invalide)."],
            "warnings": [],
            "checks": [{"name": "Société", "status": "KO", "detail": "Société introuvable."}],
        }
    checks.append({"name": "Société", "status": "OK", "detail": f"Dossier : {company.name}"})

    # ------------------------------------------------------------------ #
    # 2. Le fichier template Excel existe                                  #
    # ------------------------------------------------------------------ #
    template_exists = os.path.exists(TEMPLATE_PATH)
    if not template_exists:
        msg = (
            f"Le fichier template Excel est manquant. "
            f"Veuillez déposer 'syscohada_template.xlsx' dans le dossier backend/templates/."
        )
        checks.append({"name": "Fichier Template Excel", "status": "KO", "detail": msg})
        blockers.append(msg)
    else:
        # Check required sheet names
        try:
            import openpyxl
            wb = openpyxl.load_workbook(TEMPLATE_PATH, read_only=True)
            sheet_names = wb.sheetnames
            wb.close()
            missing_sheets = [s for s in REQUIRED_SHEETS if s not in sheet_names]
            if missing_sheets:
                msg = (
                    f"Le template Excel existe mais il manque les onglets suivants : "
                    f"{', '.join(missing_sheets)}. "
                    f"Onglets présents : {', '.join(sheet_names)}."
                )
                checks.append({"name": "Onglets du Template", "status": "KO", "detail": msg})
                blockers.append(msg)
            else:
                checks.append({
                    "name": "Onglets du Template",
                    "status": "OK",
                    "detail": f"Tous les onglets requis sont présents ({', '.join(REQUIRED_SHEETS)}).",
                })
        except Exception as exc:
            msg = f"Impossible de lire le fichier template : {str(exc)}"
            checks.append({"name": "Fichier Template Excel", "status": "KO", "detail": msg})
            blockers.append(msg)

    # ------------------------------------------------------------------ #
    # 3. Des écritures comptables existent                                 #
    # ------------------------------------------------------------------ #
    entry_query = (
        db.query(func.count(Entry.id))
        .join(Journal, Journal.id == Entry.journal_id)
        .filter(Journal.company_id == company_id)
    )
    if document_id:
        entry_query = entry_query.filter(Entry.document_id == document_id)

    nb_entries = entry_query.scalar() or 0

    if nb_entries == 0:
        source_label = f"le document #{document_id}" if document_id else "ce dossier"
        msg = (
            f"Aucune écriture comptable trouvée pour {source_label}. "
            "Veuillez d'abord importer une balance générale."
        )
        checks.append({"name": "Écritures Comptables", "status": "KO", "detail": msg})
        blockers.append(msg)
    else:
        checks.append({
            "name": "Écritures Comptables",
            "status": "OK",
            "detail": f"{nb_entries:,} écriture(s) disponible(s) pour la génération.",
        })

    # ------------------------------------------------------------------ #
    # 4. Balance équilibrée (Σ Débit = Σ Crédit)                         #
    # ------------------------------------------------------------------ #
    if nb_entries > 0:
        q_base = (
            db.query(
                func.sum(EntryLine.debit).label("total_debit"),
                func.sum(EntryLine.credit).label("total_credit"),
            )
            .join(Entry, Entry.id == EntryLine.entry_id)
            .join(Journal, Journal.id == Entry.journal_id)
            .filter(Journal.company_id == company_id)
        )
        if document_id:
            q_base = q_base.filter(Entry.document_id == document_id)

        row = q_base.first()
        total_debit  = float(row.total_debit or 0)
        total_credit = float(row.total_credit or 0)
        diff = round(abs(total_debit - total_credit), 2)

        if diff > 0.01:
            msg = (
                f"La balance n'est pas équilibrée : Σ Débit = {total_debit:,.2f} / "
                f"Σ Crédit = {total_credit:,.2f} — Écart : {diff:,.2f} FCFA. "
                "La liasse sera générée mais les totaux pourraient être faux."
            )
            checks.append({"name": "Équilibre de la Balance", "status": "WARNING", "detail": msg})
            warnings.append(msg)
        else:
            checks.append({
                "name": "Équilibre de la Balance",
                "status": "OK",
                "detail": f"Balance équilibrée — Σ D = Σ C = {total_debit:,.2f} FCFA.",
            })

    # ------------------------------------------------------------------ #
    # 5. Comptes clés alimentés (Classes requises)                        #
    # ------------------------------------------------------------------ #
    if nb_entries > 0:
        # Get all account codes that have movements for this company
        populated_codes = {
            row.code
            for row in (
                db.query(Account.code)
                .join(EntryLine, EntryLine.account_id == Account.id)
                .join(Entry, Entry.id == EntryLine.entry_id)
                .join(Journal, Journal.id == Entry.journal_id)
                .filter(Journal.company_id == company_id)
                .distinct()
                .all()
            )
        }

        for label, prefixes in REQUIRED_ACCOUNT_CLASSES.items():
            has_accounts = any(
                code.startswith(p) for code in populated_codes for p in prefixes
            )
            if not has_accounts:
                detail = (
                    f"Aucun mouvement trouvé pour les comptes commençant par "
                    f"{' / '.join(prefixes)}. "
                    "Les postes correspondants dans la liasse seront vides."
                )
                checks.append({"name": label, "status": "WARNING", "detail": detail})
                warnings.append(f"{label} : {detail}")
            else:
                # Find sample accounts
                samples = [c for c in sorted(populated_codes) if any(c.startswith(p) for p in prefixes)][:3]
                checks.append({
                    "name": label,
                    "status": "OK",
                    "detail": f"Comptes alimentés ex. : {', '.join(samples)}",
                })

    # ------------------------------------------------------------------ #
    # SUMMARY                                                              #
    # ------------------------------------------------------------------ #
    ready = len(blockers) == 0
    return {
        "ready": ready,
        "blockers": blockers,
        "warnings": warnings,
        "checks": checks,
    }


# ---------------------------------------------------------------------------
# OTR / SYSCOHADA RÉVISÉ — MAPPING COMPLET
#
# Structure : { "Nom_Feuille!Cellule": "règle" }
#
# Syntaxe des règles (ExcelInjector._get_value_for_mapping) :
#   "701*"           → Somme Débit-Crédit de tous les comptes commençant par 701
#   "-70*"           → Negate : les produits (créditeurs) sortent positifs
#   "ABS(281*)"      → Valeur absolue (amortissements = soldes créditeurs)
#   "601*, -603*"    → Plusieurs patterns : achats + variation de stock
#
# Convention SYSCOHADA :
#   Actif    = Débit positif  → signe direct (Débit - Crédit)
#   Passif   = Crédit positif → negate avec "-"
#   Produits = Crédit positif → negate avec "-"
#   Charges  = Débit positif  → signe direct
#   Amortissements = Crédit  → ABS()
# ---------------------------------------------------------------------------

OTR_MAPPING = {

    # ===========================================================
    # TABLEAU 1 : BILAN ACTIF
    # Colonne E = Valeur Brute  (✅ confirmé par analyse template)
    # Colonne F = Amortissements & Provisions
    # Colonne G = Net (formule Excel dans le template)
    # ===========================================================

    # --- ACTIF IMMOBILISÉ ---
    # Immobilisations incorporelles (20)
    "BILAN ACTIF!E13": "20*",
    "BILAN ACTIF!F13": "ABS(280*)",

    # Terrains (22)
    "BILAN ACTIF!E14": "22*",
    "BILAN ACTIF!F14": "ABS(282*)",

    # Bâtiments sur sol propre (23)
    "BILAN ACTIF!E15": "23*",
    "BILAN ACTIF!F15": "ABS(283*)",

    # Aménagements & Installations (232, 233, 241, 242)
    "BILAN ACTIF!E16": "232*, 233*, 241*, 242*",
    "BILAN ACTIF!F16": "ABS(283*, 284*)",

    # Matériel & outillage (24)
    "BILAN ACTIF!E17": "24*",
    "BILAN ACTIF!F17": "ABS(284*)",

    # Matériel de transport (25)
    "BILAN ACTIF!E18": "25*",
    "BILAN ACTIF!F18": "ABS(285*)",

    # Avances sur immobilisations (26)
    "BILAN ACTIF!E19": "26*",

    # Immobilisations financières (27)
    "BILAN ACTIF!E20": "27*",
    "BILAN ACTIF!F20": "ABS(29*)",

    # --- ACTIF CIRCULANT ---
    # Stocks (31-38) brut + provisions (39)
    "BILAN ACTIF!E23": "31*, 32*, 33*, 34*, 35*, 36*, 37*, 38*",
    "BILAN ACTIF!F23": "ABS(391*, 392*, 393*, 394*, 395*, 396*, 397*, 398*)",

    # Clients (411-418) brut + provisions (491)
    "BILAN ACTIF!E25": "411*, 412*, 413*, 414*, 416*, 418*",
    "BILAN ACTIF!F25": "ABS(491*)",

    # Autres créances (409, 44, 45, 46, 47, 48)
    "BILAN ACTIF!E26": "409*, 44*, 45*, 46*, 47*, 48*",

    # --- TRÉSORERIE ACTIVE ---
    # Titres de placement (50)
    "BILAN ACTIF!E27": "50*",
    "BILAN ACTIF!F27": "ABS(590*)",

    # Banques (52), Chèques postaux (53), Caisses (57)
    "BILAN ACTIF!E28": "52*, 53*, 57*",

    # Autres disponibilités (58)
    "BILAN ACTIF!E29": "58*",

    # ===========================================================
    # TABLEAU 2 : BILAN PASSIF
    # Colonne F = Exercice N  (✅ confirmé par analyse template)
    # Colonne G = Exercice N-1
    # Convention : passif créditeur → -compte pour valeur positive
    # ===========================================================

    # --- CAPITAUX PROPRES ---
    "BILAN PASSIF!F11": "-101*, -102*",   # Capital social / apporté
    "BILAN PASSIF!F12": "-101*, -102*",   # Capital souscrit appelé
    "BILAN PASSIF!F13": "-105*",          # Primes d'apport/émission
    "BILAN PASSIF!F15": "-14*",           # Subventions d'investissement
    "BILAN PASSIF!F16": "-15*",           # Provisions réglementées
    "BILAN PASSIF!F17": "-111*, -112*, -118*",  # Réserves
    "BILAN PASSIF!F19": "-12*",           # Report à nouveau
    "BILAN PASSIF!F20": "-13*",           # Résultat net exercice

    # --- DETTES FINANCIÈRES ---
    "BILAN PASSIF!F22": "-16*, -17*",     # Emprunts LT

    # --- PASSIF CIRCULANT ---
    "BILAN PASSIF!F23": "-419*",          # Avances clients
    "BILAN PASSIF!F24": "-16*, -17*",     # Dettes financières CT
    "BILAN PASSIF!F27": "-401*, -402*, -403*, -408*",  # Fournisseurs
    "BILAN PASSIF!F28": "-42*, -43*, -44*",            # Personnel / Fisc / Social
    "BILAN PASSIF!F29": "-45*, -46*, -47*, -48*",      # Autres dettes
    "BILAN PASSIF!F30": "-419*",          # Avances reçues CT
    "BILAN PASSIF!F31": "-56*",           # Découverts bancaires
    "BILAN PASSIF!F32": "-56*",           # Concours bancaires CT

    # ===========================================================
    # TABLEAU 3 : COMPTE DE RÉSULTAT
    # Colonne H = Exercice N  (✅ confirmé par analyse template)
    # Colonne I = Exercice N-1
    # ===========================================================

    # --- PRODUITS D'EXPLOITATION (Classe 7) ---
    # Ligne 10 : Ventes de marchandises / Chiffre d'Affaires
    "COMPTE DE RESULTAT!H10": "-701*, -702*, -703*, -704*, -705*, -706*, -707*",
    # Ligne 11 : Travaux facturés (si séparé)
    "COMPTE DE RESULTAT!H11": "-705*, -706*",
    # Ligne 12 : Production immobilisée + stockée
    "COMPTE DE RESULTAT!H12": "-72*, -73*",
    # Ligne 14 : Subventions d'exploitation
    "COMPTE DE RESULTAT!H14": "-74*",
    # Ligne 15 : Autres produits d'exploitation
    "COMPTE DE RESULTAT!H15": "-75*",
    # Ligne 16 : Transferts de charges
    "COMPTE DE RESULTAT!H16": "-781*",

    # --- CHARGES D'EXPLOITATION (Classe 6) ---
    # Ligne 18 : Achats marchandises + variation stocks
    "COMPTE DE RESULTAT!H18": "601*, 6031*",
    # Ligne 19 : Achats matières 1ères + variation
    "COMPTE DE RESULTAT!H19": "602*, 6032*",
    # Ligne 20 : Autres achats
    "COMPTE DE RESULTAT!H20": "608*",
    # Ligne 21 : Variation stocks autres
    "COMPTE DE RESULTAT!H21": "603*",
    # Ligne 22 : Transports
    "COMPTE DE RESULTAT!H22": "61*",
    # Ligne 23 : Services extérieurs A (loyers, entretiens)
    "COMPTE DE RESULTAT!H23": "621*, 622*, 623*, 624*, 625*",
    # Ligne 24 : Services extérieurs B (honoraires, assurances)
    "COMPTE DE RESULTAT!H24": "626*, 627*, 628*, 631*, 632*, 633*, 634*, 635*, 636*, 637*, 638*",
    # Ligne 25 : Impôts & taxes
    "COMPTE DE RESULTAT!H25": "64*",
    # Ligne 26 : Autres charges
    "COMPTE DE RESULTAT!H26": "65*",
    # Ligne 27 : Charges de personnel (salaires+charges)
    "COMPTE DE RESULTAT!H27": "66*",

    # --- RÉSULTAT FINANCIER ---
    # Ligne 28 : Produits financiers
    "COMPTE DE RESULTAT!H28": "-77*",
    # Ligne 29 : Charges financières
    "COMPTE DE RESULTAT!H29": "67*",

    # --- DOTATIONS & REPRISES ---
    # Ligne 30 : Reprises (78)
    "COMPTE DE RESULTAT!H30": "-78*",
    # Ligne 32 : Dotations amortissements & provisions
    "COMPTE DE RESULTAT!H32": "68*",

    # --- HAO ---
    # Ligne 34 : Produits HAO
    "COMPTE DE RESULTAT!H34": "-85*, -86*, -87*, -88*",
    # Ligne 37 : Charges HAO
    "COMPTE DE RESULTAT!H37": "81*, 82*, 83*, 84*",
    # Ligne 38 : Dotations HAO
    "COMPTE DE RESULTAT!H38": "85*, 86*, 87*, 88*",
    # Ligne 39 : Impôt sur bénéfices (IS)
    "COMPTE DE RESULTAT!H39": "89*",
    # Ligne 40 : Participation travailleurs
    "COMPTE DE RESULTAT!H40": "87*",

    # ===========================================================
    # TABLEAU 4 : RÉSULTAT FISCAL
    # D'après analyse :
    #   Col B = numéros de renvoi (10, 11, 12, 20, 25...)
    #   Col C = libellés (texte)
    #   Col D = formules
    # → La saisie des montants se fait en colonne C (montants N)
    #   OU la colonne de saisie est cachée / différente
    # ATTENTION: à vérifier visuellement dans le template.
    # Par sécurité, on utilise colonne C (la seule avec une valeur numérique trouvée)
    # ===========================================================

    # Résultat comptable (compte 13 — solde créditeur = bénéfice)
    "Résultat fiscal!C5": "-13*",

    # RÉINTÉGRATIONS
    "Résultat fiscal!C9": "657*",     # Amendes et pénalités
    "Résultat fiscal!C10": "658*",    # Charges non justifiées
    "Résultat fiscal!C11": "6234*",   # Cadeaux > plafond

    # DÉDUCTIONS
    "Résultat fiscal!C15": "-848*, -849*",  # Plus-values exonérées

    # ===========================================================
    # TABLEAU 5 : FLUX DE TRÉSORERIE (TFT)
    # À vérifier dans le template — colonne à confirmer
    # ===========================================================
    "TFT!E30": "52*, 53*, 57*",
    "TFT!E31": "-56*",
}






# ---------------------------------------------------------------------------
# DEBUG ENDPOINT — Diagnostiquer le mappage
# ---------------------------------------------------------------------------

@router.get("/debug/{company_id}")
def debug_injection(company_id: int, document_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Retourne un rapport complet pour diagnostiquer pourquoi les cellules ne sont pas injectées.
    - Montre les soldes calculés par compte
    - Montre quels mappings OTR donnent une valeur non nulle
    - Vérifie si les sheets/cellules existent dans le template
    """
    from ..services.injector import ExcelInjector
    import openpyxl

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Société introuvable")

    # ── Calcul des soldes ──
    injector = ExcelInjector(db, company_id, document_id=document_id)
    injector._fetch_balances()

    balances_non_nuls = {k: v for k, v in injector.balances.items() if v != 0}

    # ── Évaluation du mapping ──
    mapping_hits = []
    mapping_zeros = []
    for cell_ref, rule in OTR_MAPPING.items():
        val = injector._get_value_for_mapping(rule)
        entry = {"cell": cell_ref, "rule": rule, "value": round(val, 2)}
        if val != 0:
            mapping_hits.append(entry)
        else:
            mapping_zeros.append(entry)

    # ── Vérification des onglets du template ──
    template_info = {}
    if os.path.exists(TEMPLATE_PATH):
        wb = openpyxl.load_workbook(TEMPLATE_PATH, read_only=True)
        template_info["sheets"] = wb.sheetnames
        # Check a few cells for existing content
        cell_sample = {}
        for sheet_name in ["BILAN ACTIF", "BILAN PASSIF", "COMPTE DE RESULTAT", "Résultat fiscal"]:
            if sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                # Sample first few injectable cells
                sample = {}
                for cell_ref, rule in list(OTR_MAPPING.items())[:5]:
                    if cell_ref.startswith(sheet_name + "!"):
                        addr = cell_ref.split("!")[1]
                        try:
                            cell = ws[addr]
                            sample[addr] = {
                                "current_value": str(cell.value)[:50] if cell.value is not None else None,
                                "data_type": cell.data_type if hasattr(cell, 'data_type') else "?"
                            }
                        except Exception as e:
                            sample[addr] = {"error": str(e)}
                if sample:
                    cell_sample[sheet_name] = sample
        wb.close()
        template_info["cell_samples"] = cell_sample
    else:
        template_info["error"] = f"Template introuvable : {TEMPLATE_PATH}"

    return {
        "company": company.name,
        "document_id": document_id,
        "nb_accounts_with_balance": len(injector.balances),
        "nb_nonzero_balances": len(balances_non_nuls),
        "balances_top20": dict(sorted(balances_non_nuls.items(), key=lambda x: abs(x[1]), reverse=True)[:20]),
        "mapping_hits_count": len(mapping_hits),
        "mapping_zeros_count": len(mapping_zeros),
        "mapping_hits": mapping_hits,
        "mapping_zeros_sample": mapping_zeros[:10],
        "template": template_info,
    }


# ---------------------------------------------------------------------------
# GENERATE ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/generate/{company_id}")
async def generate_liasse(
    company_id: int,
    document_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Generate the fiscal liasse (OTR/SYSCOHADA) by injecting account balances into the template."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Société introuvable")

    if not os.path.exists(TEMPLATE_PATH):
        raise HTTPException(
            status_code=500,
            detail=f"Template Excel introuvable : {TEMPLATE_PATH}. Veuillez déposer 'syscohada_template.xlsx' dans le dossier 'templates/'."
        )

    injector = ExcelInjector(db, company_id, document_id=document_id)

    safe_name = (company.tax_id or str(company_id)).replace("/", "-")
    output_filename = f"Liasse_OTR_{safe_name}_{datetime.now().strftime('%Y%m%d%H%M')}.xlsx"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    try:
        injector.generate_report(
            template_path=TEMPLATE_PATH,
            output_path=output_path,
            mapping_config=OTR_MAPPING,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"[generate_liasse] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur génération liasse : {str(e)}")

    return FileResponse(
        output_path,
        filename=output_filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.get("/generate-smt/{company_id}")
async def generate_smt(
    company_id: int,
    document_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Generate the Synthèse des Moyens de Trésorerie (SMT) — reuses OTR engine."""
    return await generate_liasse(company_id, document_id, db)


# ---------------------------------------------------------------------------
# TEMPLATE CRUD BY ID (MUST be AFTER static routes)
# ---------------------------------------------------------------------------

@router.get("/{template_id}")
def get_template_by_id(template_id: int, db: Session = Depends(get_db)):
    """Get a single template by ID."""
    tmpl = db.query(models.ReportTemplate).filter(models.ReportTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Modèle introuvable")
    return tmpl


@router.put("/{template_id}/mapping")
def update_template_mapping(template_id: int, payload: dict, db: Session = Depends(get_db)):
    """Update the mapping configuration of a template."""
    tmpl = db.query(models.ReportTemplate).filter(models.ReportTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Modèle introuvable")
    tmpl.mapping_config = payload.get("mapping_config", tmpl.mapping_config)
    db.commit()
    db.refresh(tmpl)
    return tmpl
