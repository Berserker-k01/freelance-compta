from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io
import math
import os
import shutil
from datetime import datetime

from .. import schemas, crud, models
from ..database import get_db
from ..syscohada import seed_syscohada

router = APIRouter(
    prefix="/accounting",
    tags=["accounting"],
    responses={404: {"description": "Not found"}},
)

# --- ACCOUNTS ---
@router.post("/accounts/", response_model=schemas.Account)
def create_account(account: schemas.AccountCreate, company_id: int, db: Session = Depends(get_db)):
    return crud.create_account(db=db, account=account, company_id=company_id)

@router.get("/accounts/{company_id}", response_model=List[schemas.Account])
def read_accounts(company_id: int, skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    # Increased limit for full plan
    accounts = crud.get_accounts(db, company_id=company_id, skip=skip, limit=limit)
    return accounts

@router.post("/accounts/seed/{company_id}")
def seed_default_plan(company_id: int, db: Session = Depends(get_db)):
    """Initialize SYSCOHADA plan for a company"""
    return seed_syscohada(db, company_id)

# --- JOURNALS ---
@router.get("/journals/{company_id}", response_model=List[schemas.Journal])
def read_journals(company_id: int, db: Session = Depends(get_db)):
    return db.query(models.Journal).filter(models.Journal.company_id == company_id).all()

@router.post("/journals/", response_model=schemas.Journal)
def create_journal(journal: schemas.JournalCreate, company_id: int, db: Session = Depends(get_db)):
    db_journal = models.Journal(**journal.model_dump(), company_id=company_id)
    db.add(db_journal)
    db.commit()
    db.refresh(db_journal)
    return db_journal

# --- ENTRIES ---
@router.post("/entries/", response_model=schemas.Entry)
def create_entry_transaction(entry: schemas.EntryCreate, db: Session = Depends(get_db)):
    # Validate Debit = Credit
    total_debit = sum(line.debit for line in entry.lines)
    total_credit = sum(line.credit for line in entry.lines)
    
    if abs(total_debit - total_credit) > 0.05: # Allow small float error
        raise HTTPException(status_code=400, detail=f"Unbalanced Entry: Debit ({total_debit}) != Credit ({total_credit})")
        
    return crud.create_entry(db=db, entry=entry)

@router.get("/entries/", response_model=List[schemas.Entry])
def read_entries(company_id: int = None, journal_id: int = None, skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    query = db.query(models.Entry)
    if journal_id:
        query = query.filter(models.Entry.journal_id == journal_id)
    elif company_id:
        # Filter by company through journal
        query = query.join(models.Journal).filter(models.Journal.company_id == company_id)
    return query.order_by(models.Entry.date.desc()).offset(skip).limit(limit).all()

# --- IMPORT BALANCE ---
@router.post("/import-balance/{company_id}")
async def import_balance(company_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Importe une Balance Générale (Excel ou CSV) au format SYSCOHADA Révisé.

    Formats acceptés :
    - 4 colonnes  : Compte | Libellé | Débit | Crédit
    - 6 colonnes  : Compte | Libellé | Débit Mvt | Crédit Mvt | Solde D | Solde C
    - 8 colonnes  : Compte | Libellé | Débit Mvt | Crédit Mvt | Reprise AN | ... | Solde D | Solde C
    Lorsque les soldes ET les mouvements sont présents, on utilise les SOLDES (colonnes finales).
    """

    # ------------------------------------------------------------------ #
    # 1. Sauvegarde physique du fichier                                    #
    # ------------------------------------------------------------------ #
    BASE_UPLOAD_DIR = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads"
    )
    company_dir = os.path.join(BASE_UPLOAD_DIR, str(company_id))
    os.makedirs(company_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(company_dir, safe_filename)

    contents = await file.read()
    with open(file_path, "wb") as buf:
        buf.write(contents)

    # Essai de détection de l'exercice dans le nom de fichier (ex: "Balance_2025.xlsx")
    import re
    year_match = re.search(r"20\d{2}", file.filename)
    fiscal_year = int(year_match.group()) if year_match else datetime.now().year

    # ------------------------------------------------------------------ #
    # 2. Enregistrement du Document                                        #
    # ------------------------------------------------------------------ #
    db_doc = models.Document(
        name=f"Balance Générale {fiscal_year} — Import {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        filename=safe_filename,
        file_path=file_path,
        file_type="balance",
        company_id=company_id,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    # ------------------------------------------------------------------ #
    # 3. Lecture du fichier                                                #
    # ------------------------------------------------------------------ #
    try:
        if file.filename.lower().endswith(".csv"):
            # Try semicolon first (French locale), then comma
            try:
                df_raw = pd.read_csv(io.BytesIO(contents), sep=";", header=None, dtype=str)
                if df_raw.shape[1] < 3:
                    df_raw = pd.read_csv(io.BytesIO(contents), sep=",", header=None, dtype=str)
            except Exception:
                df_raw = pd.read_csv(io.BytesIO(contents), header=None, dtype=str)
        else:
            df_raw = pd.read_excel(io.BytesIO(contents), header=None, dtype=str)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Fichier illisible : {str(exc)}")

    # ------------------------------------------------------------------ #
    # 4. Détection des en-têtes                                           #
    # ------------------------------------------------------------------ #
    # Scan the first 5 rows to find a header row
    header_row_idx = None
    HEADER_KEYWORDS = {"compte", "account", "numero", "numéro", "code", "libellé", "intitulé"}

    for i in range(min(5, len(df_raw))):
        row_vals = {str(v).strip().lower() for v in df_raw.iloc[i].tolist()}
        if row_vals & HEADER_KEYWORDS:
            header_row_idx = i
            break

    if header_row_idx is not None:
        df = df_raw.iloc[header_row_idx + 1:].reset_index(drop=True)
        df.columns = [str(v).strip().lower() for v in df_raw.iloc[header_row_idx].tolist()]
    else:
        df = df_raw.copy()
        # Generate positional column names
        num_cols = df.shape[1]
        col_names = [f"col_{i}" for i in range(num_cols)]
        # ── Standard SYSCOHADA balance layouts ──
        # 4-col : Compte | Libellé | Débit | Crédit
        # 6-col : Compte | Libellé | Débit Mvt | Crédit Mvt | Solde D | Solde C
        # 8-col : Compte | Libellé | Débit Mvt | Crédit Mvt | AN D | AN C | Solde D | Solde C
        if num_cols >= 2:
            col_names[0] = "compte"
            col_names[1] = "libellé"
        if num_cols == 4:
            col_names[2] = "solde_debit"
            col_names[3] = "solde_credit"
        elif num_cols == 6:
            col_names[2] = "mvt_debit"
            col_names[3] = "mvt_credit"
            col_names[4] = "solde_debit"
            col_names[5] = "solde_credit"
        elif num_cols >= 8:
            # Use last two numeric columns as soldes
            col_names[num_cols - 2] = "solde_debit"
            col_names[num_cols - 1] = "solde_credit"
        df.columns = col_names

    df.columns = [str(c).strip().lower() for c in df.columns]

    # ------------------------------------------------------------------ #
    # 5. Identification des colonnes clés                                  #
    # ------------------------------------------------------------------ #
    col_map: dict[str, str] = {}

    ACCOUNT_KEYS  = ["compte", "account", "numéro", "numero", "code"]
    LABEL_KEYS    = ["libellé", "intitulé", "label", "description", "libelle", "intitule"]
    # Prefer solde columns over mouvement columns
    DEBIT_KEYS    = ["solde_debit", "solde débit", "sd", "débit", "debit"]
    CREDIT_KEYS   = ["solde_credit", "solde crédit", "sc", "crédit", "credit"]
    BALANCE_KEYS  = ["solde", "balance"]

    for col in df.columns:
        col_l = col.lower()
        if not col_map.get("account") and any(k in col_l for k in ACCOUNT_KEYS):
            col_map["account"] = col
        if not col_map.get("label") and any(k in col_l for k in LABEL_KEYS):
            col_map["label"] = col
        if not col_map.get("debit") and any(k in col_l for k in DEBIT_KEYS):
            col_map["debit"] = col
        if not col_map.get("credit") and any(k in col_l for k in CREDIT_KEYS):
            col_map["credit"] = col
        if not col_map.get("balance") and any(k in col_l for k in BALANCE_KEYS):
            col_map["balance"] = col

    if "account" not in col_map:
        raise HTTPException(
            status_code=400,
            detail=(
                "Impossible de trouver la colonne 'Compte' dans le fichier. "
                "Vérifiez que votre fichier contient bien les colonnes : "
                "Compte | Libellé | Débit | Crédit (ou Solde Débiteur | Solde Créditeur)."
            )
        )

    # ------------------------------------------------------------------ #
    # 6. Journal OD propre à la société                                    #
    # ------------------------------------------------------------------ #
    od_journal = (
        db.query(models.Journal)
        .filter(models.Journal.company_id == company_id, models.Journal.code == "OD")
        .first()
    )
    if not od_journal:
        od_journal = models.Journal(code="OD", name="Opérations Diverses", company_id=company_id)
        db.add(od_journal)
        db.commit()
        db.refresh(od_journal)

    # ------------------------------------------------------------------ #
    # 7. Parsing ligne par ligne                                           #
    # ------------------------------------------------------------------ #
    existing_accounts = {acc.code: acc for acc in crud.get_accounts(db, company_id, limit=5000)}
    entry_lines: list[schemas.EntryLineCreate] = []
    skipped_rows = 0
    accounts_created = 0

    def _to_float(val) -> float:
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return 0.0
        try:
            return float(str(val).replace(" ", "").replace("\xa0", "").replace(",", "."))
        except (ValueError, TypeError):
            return 0.0

    for _, row in df.iterrows():
        code_raw = str(row.get(col_map["account"], "")).split(".")[0].strip().lstrip("0")
        # Keep leading structure: don't strip all zeros (e.g. "101" not "11")
        code_raw = str(row.get(col_map["account"], "")).strip()
        # Remove trailing decimals e.g. "411.0" → "411"
        code_raw = code_raw.split(".")[0].strip()

        if not code_raw or code_raw.lower() in {"nan", "", "total", "totaux"}:
            skipped_rows += 1
            continue

        # Skip non-numeric account codes (subtotals lines, etc.)
        if not re.match(r"^\d{2,}", code_raw):
            skipped_rows += 1
            continue

        label_raw = str(row.get(col_map.get("label", ""), "Solde Initial")).strip()
        if not label_raw or label_raw.lower() == "nan":
            label_raw = f"Compte {code_raw}"

        # Read debit/credit
        if "debit" in col_map and "credit" in col_map:
            debit  = _to_float(row.get(col_map["debit"]))
            credit = _to_float(row.get(col_map["credit"]))
        elif "balance" in col_map:
            bal = _to_float(row.get(col_map["balance"]))
            debit  = bal if bal > 0 else 0.0
            credit = abs(bal) if bal < 0 else 0.0
        else:
            skipped_rows += 1
            continue

        if debit == 0.0 and credit == 0.0:
            skipped_rows += 1
            continue

        # Find or create account
        if code_raw not in existing_accounts:
            try:
                class_code = int(code_raw[0])
            except (ValueError, IndexError):
                class_code = 0

            new_acc = schemas.AccountCreate(
                code=code_raw,
                name=label_raw[:120],
                class_code=class_code,
            )
            db_acc = crud.create_account(db, new_acc, company_id)
            existing_accounts[code_raw] = db_acc
            accounts_created += 1

        account_id = existing_accounts[code_raw].id
        entry_lines.append(schemas.EntryLineCreate(
            account_id=account_id,
            debit=round(debit, 2),
            credit=round(credit, 2),
            label=label_raw[:120],
        ))

    if not entry_lines:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Aucune ligne comptable valide trouvée ({skipped_rows} lignes ignorées). "
                "Vérifiez le format du fichier et que les colonnes Compte / Débit / Crédit sont présentes."
            )
        )

    # ------------------------------------------------------------------ #
    # 8. Équilibrage automatique via compte d'attente 479                  #
    # ------------------------------------------------------------------ #
    total_d = round(sum(l.debit for l in entry_lines), 2)
    total_c = round(sum(l.credit for l in entry_lines), 2)
    gap      = round(total_d - total_c, 2)
    gap_note = None

    SUSPENSE_CODE = "4799"
    if abs(gap) > 0.01:
        # Create / re-use compte d'attente 4799
        if SUSPENSE_CODE not in existing_accounts:
            susp_acc = schemas.AccountCreate(code=SUSPENSE_CODE, name="Compte d'attente — Écart de balance", class_code=4)
            db_susp  = crud.create_account(db, susp_acc, company_id)
            existing_accounts[SUSPENSE_CODE] = db_susp
            accounts_created += 1

        susp_id = existing_accounts[SUSPENSE_CODE].id
        if gap > 0:
            # Debit > Credit → add credit line to balance
            entry_lines.append(schemas.EntryLineCreate(
                account_id=susp_id, debit=0.0, credit=gap,
                label=f"Équilibrage automatique — Écart {gap:,.2f}"
            ))
        else:
            # Credit > Debit → add debit line to balance
            entry_lines.append(schemas.EntryLineCreate(
                account_id=susp_id, debit=abs(gap), credit=0.0,
                label=f"Équilibrage automatique — Écart {abs(gap):,.2f}"
            ))

        gap_note = (
            f"⚠ La balance importée présentait un écart de {abs(gap):,.2f} FCFA "
            f"({'Débit > Crédit' if gap > 0 else 'Crédit > Débit'}). "
            f"Il a été passé automatiquement en compte d'attente {SUSPENSE_CODE}. "
            "Vérifiez et corrigez si nécessaire avant de générer la liasse."
        )

    # ------------------------------------------------------------------ #
    # 9. Création de l'écriture                                            #
    # ------------------------------------------------------------------ #
    entry_data = schemas.EntryCreate(
        company_id=company_id,
        journal_id=od_journal.id,
        date=datetime(fiscal_year, 12, 31),   # Close of fiscal year
        reference=f"BG-{fiscal_year}",
        label=f"Balance Générale {fiscal_year} — {file.filename}",
        document_id=db_doc.id,
        lines=entry_lines,
    )

    try:
        new_entry = crud.create_entry(db, entry_data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur création d'écriture : {str(exc)}")

    return {
        "status": "success",
        "document_id": db_doc.id,
        "entries_count": len(entry_lines),
        "accounts_created": accounts_created,
        "accounts_matched": len(entry_lines) - accounts_created,
        "skipped_rows": skipped_rows,
        "fiscal_year": fiscal_year,
        "total_debit": round(total_d, 2),
        "total_credit": round(total_c, 2),
        "gap": round(gap, 2),
        "gap_note": gap_note,
    }


