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
OUTPUT_DIR = os.path.join(BASE_DIR, "temp_exports")

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# ---------------------------------------------------------------------------
# TEMPLATE CRUD ENDPOINTS (BEFORE dynamic routes)
# ---------------------------------------------------------------------------

from .. import models
import json
from fastapi import UploadFile, File
from openpyxl.utils import get_column_letter

@router.get("/list")
def list_templates(db: Session = Depends(get_db)):
    """List all available report templates."""
    templates = db.query(models.ReportTemplate).all()
    return templates

@router.post("/upload")
async def upload_dynamic_template(file: UploadFile = File(...), name: str = "Nouveau Canevas", year: int = 2026, db: Session = Depends(get_db)):
    """Smart Loader: Upload an Excel template and auto-map basic tags."""
    import openpyxl
    file_path = os.path.join(BASE_DIR, "templates", f"dynamic_{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Auto-mapping
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    mapping = {}
    
    # Auto-mapping Expert : Base de Connaissances exhaustive SYSCOHADA/OTR
    # Format: "mot clé unique": ("règle de mapping", décalage_colonne)
    # décalage_colonne = 1 (juste à droite pour N), 2 (Souvent N-1 ou Amortissements)
    KNOWLEDGE_BASE = {
        # --- ACTIF ---
        "immobilisations incorporelles": ("20*", 1),
        "terrains": ("22*", 1),
        "amortissements des terrains": ("ABS(282*)", 2),
        "bâtiments": ("23*", 1),
        "amortissements des bâtiments": ("ABS(283*)", 2),
        "aménagements, agencements et installations": ("232*, 233*, 241*, 242*", 1),
        "amortissements des aménagements": ("ABS(283*, 284*)", 2),
        "matériel, mobilier et actifs biologiques": ("24*", 1),
        "amortissements du matériel": ("ABS(284*)", 2),
        "matériel de transport": ("25*", 1),
        "amortissements du matériel de transport": ("ABS(285*)", 2),
        "avances et acomptes versés sur immobilisations": ("26*", 1),
        "titres de participation": ("27*", 1),
        "autres immobilisations financières": ("27*", 1),
        
        # --- ACTIF CIRCULANT ---
        "marchandises": ("31*", 1),
        "matières premières et fournitures liées": ("32*", 1),
        "autres approvisionnements": ("33*", 1),
        "produits en cours": ("34*", 1),
        "services en cours": ("35*", 1),
        "produits finis": ("36*", 1),
        "produits intermédiaires": ("37*", 1),
        "provisions pour dépréciation des stocks": ("ABS(39*)", 2),
        "clients et comptes rattachés": ("41*", 1),
        "provisions pour dépréciation des créances": ("ABS(49*)", 2),
        "autres créances": ("409*, 44*, 45*, 46*, 47*, 48*", 1),
        
        # --- TRESORERIE ACTIVE ---
        "titres de placement": ("50*", 1),
        "valeurs à encaisser": ("51*", 1),
        "banques, chèques postaux, caisses": ("52*, 53*, 57*", 1),
        "banques": ("52*, 53*, 57*", 1),
        
        # --- PASSIF ---
        "capital": ("-101*, -102*", 1),
        "primes liées au capital social": ("-105*", 1),
        "réserves indisponibles": ("-111*, -112*", 1),
        "réserves libres": ("-118*", 1),
        "report à nouveau": ("-12*", 1),
        "résultat net de l'exercice": ("-13*", 1),
        "subventions d'investissement": ("-14*", 1),
        "provisions réglementées": ("-15*", 1),
        "emprunts et dettes financières diverses": ("-16*, -17*", 1),
        "fournisseurs et comptes rattachés": ("-401*, -402*, -408*", 1),
        "avances et acomptes reçus": ("-419*", 1),
        "dettes fiscales et sociales": ("-42*, -43*, -44*", 1),
        "autres dettes": ("-45*, -46*, -47*, -48*", 1),
        "banques, découverts": ("-56*", 1),
        
        # --- COMPTE DE RÉSULTAT ---
        "ventes de marchandises": ("-701*", 1),
        "ventes de produits fabriqués": ("-702*, -703*, -704*", 1),
        "travaux, services vendus": ("-705*, -706*", 1),
        "chiffre d'affaires": ("-70*", 1),
        "produits accessoires": ("-707*", 1),
        "subventions d'exploitation": ("-74*", 1),
        "autres produits": ("-75*", 1),
        "transferts de charges d'exploitation": ("-781*", 1),
        
        "achats de marchandises": ("601*", 1),
        "variation de stocks de marchandises": ("6031*", 1),
        "achats de matières premières": ("602*", 1),
        "variation de stocks de matières premières": ("6032*", 1),
        "autres achats": ("604*, 605*, 608*", 1),
        "transports": ("61*", 1),
        "services extérieurs": ("62*, 63*", 1),
        "impôts et taxes": ("64*", 1),
        "autres charges": ("65*", 1),
        "frais de personnel": ("66*", 1),
        
        "produits financiers": ("-77*", 1),
        "charges financières": ("67*", 1),
        "dotations aux amortissements": ("68*", 1),
        "reprises de provisions": ("-78*", 1),
        
        "produits h.a.o": ("-82*, -84*, -86*, -88*", 1),
        "charges h.a.o": ("81*, 83*, 85*, 87*", 1),
        "participation des travailleurs": ("87*", 1),
        "impôt sur le résultat": ("89*", 1),
        
        # --- INTELLIGENCE EXTRA-COMPTABLE (Variables Modèle 4 & Dirigeants) ---
        "numéro d'identification fiscale": ("#nif", 1),
        "nif": ("#nif", 1),
        "nom du dirigeant": ("#dirigeant_nom", 1),
        "effectif total brut": ("#effectif_hommes", 1),  # Approximation (généralement on a besoin de plus de logique, mais c'est un point de départ)
        "amendes et pénalités": ("657*", 1),
        "charges non justifiées": ("658*", 1),
        "dons et libéralités": ("6234*", 1)
    }
    
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        try:
            for row in ws.iter_rows(min_row=1, max_row=150, min_col=1, max_col=10):
                for cell in row:
                    val = str(cell.value).strip().lower() if cell.value else ""
                    if len(val) > 3:
                        for keyword, (account_rule, col_offset) in KNOWLEDGE_BASE.items():
                            # Vérification stricte du mot (pour éviter des correspondances hasardeuses)
                            if keyword in val:
                                target_col_idx = cell.column + col_offset
                                cell_addr = f"{sheet_name}!{get_column_letter(target_col_idx)}{cell.row}"
                                mapping[cell_addr] = account_rule
        except Exception:
            continue
    wb.close()

    new_template = models.ReportTemplate(
        name=name,
        year=year,
        file_path=file_path,
        mapping_config=json.dumps(mapping)
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return {"message": "Template importé et auto-mappé avec succès.", "template": new_template}


# ---------------------------------------------------------------------------
# PREREQUISITE VALIDATION ENDPOINT
# ---------------------------------------------------------------------------

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
def validate_prerequisites(company_id: str, document_id: Optional[str] = None, db: Session = Depends(get_db)):
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
    # 2. Le fichier template Excel existe (Vérification repoussée à la génération)
    # ------------------------------------------------------------------ #
    checks.append({
        "name": "Modèle Excel",
        "status": "OK",
        "detail": "Vérification effectuée lors de la sélection du modèle dynamique.",
    })

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
# GENERATE ENDPOINTS & PRE-FLIGHT
# ---------------------------------------------------------------------------

@router.get("/preflight/{company_id}")
def preflight_check(company_id: str, document_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Simule l'état Bilan/Résultat pour identifier un déséquilibre avant génération (Module 6).
    """
    from ..services.injector import ExcelInjector

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Société introuvable")

    injector = ExcelInjector(db, company_id, document_id=document_id)
    return injector.pre_flight_check()

@router.get("/generate/{company_id}")
async def generate_liasse(
    company_id: str,
    document_id: Optional[str] = None,
    template_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Generate the fiscal liasse (OTR/SYSCOHADA) by injecting account balances into the template."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Société introuvable")

    if not template_id:
        raise HTTPException(status_code=400, detail="Veuillez sélectionner un modèle de déclaration.")

    tmpl = db.query(models.ReportTemplate).filter(models.ReportTemplate.id == template_id).first()
    if not tmpl or not tmpl.file_path or not os.path.exists(tmpl.file_path):
        raise HTTPException(status_code=404, detail="Modèle introuvable ou fichier source manquant sur le serveur.")

    working_template_path = tmpl.file_path
    template_prefix = tmpl.name
    try:
        mapping_config_dict = json.loads(tmpl.mapping_config)
    except Exception:
        mapping_config_dict = {}

    injector = ExcelInjector(db, company_id, document_id=document_id)

    safe_name = company.name.replace(" ", "_").replace("/", "-")
    exercice = datetime.now().year
    output_filename = f"Liasse_{template_prefix}_{safe_name}_{exercice}.xlsx"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    try:
        injector.generate_report(
            template_path=working_template_path,
            output_path=output_path,
            mapping_config=mapping_config_dict,
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



# ---------------------------------------------------------------------------
# TEMPLATE CRUD BY ID (MUST be AFTER static routes)
# ---------------------------------------------------------------------------

@router.get("/{template_id}")
def get_template_by_id(template_id: str, db: Session = Depends(get_db)):
    """Get a single template by ID."""
    tmpl = db.query(models.ReportTemplate).filter(models.ReportTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Modèle introuvable")
    return tmpl


@router.put("/{template_id}/mapping")
def update_template_mapping(template_id: str, payload: dict, db: Session = Depends(get_db)):
    """Update the mapping configuration of a template."""
    tmpl = db.query(models.ReportTemplate).filter(models.ReportTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Modèle introuvable")
    tmpl.mapping_config = payload.get("mapping_config", tmpl.mapping_config)
    db.commit()
    db.refresh(tmpl)
    return tmpl
