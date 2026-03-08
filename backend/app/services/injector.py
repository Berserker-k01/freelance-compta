import openpyxl
from openpyxl.utils import column_index_from_string, get_column_letter
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
import os


class ExcelInjector:
    """
    Engine for injecting account balances from the database
    into a structured Excel template (SYSCOHADA / OTR format).

    Mapping rule syntax (supports multi-pattern, negation, ABS):
        "20*"           → Σ (Debit - Credit) for accounts starting with "20"
        "-70*"          → negate result (revenues are credit-heavy → flip positive)
        "ABS(280*)"     → absolute value (amortissements are credit → force positive)
        "601*, -603*"   → sum multiple patterns (achats + variation de stocks)
    """

    def __init__(self, db: Session, company_id: str, document_id: str = None):
        self.db = db
        self.company_id = company_id
        self.document_id = document_id
        # { account_code: (debit_total, credit_total) }
        self.raw: dict[str, tuple[float, float]] = {}
        # { account_code: net_balance (debit - credit) }
        self.balances: dict[str, float] = {}
        self.annexe_data: dict[str, str] = {}
        self._log: list[str] = []

    # ------------------------------------------------------------------
    # 1. DATA FETCHING
    # ------------------------------------------------------------------

    def _fetch_balances(self):
        """
        Computes per-account totals from EntryLine table.
        Filters by company_id, optionally by document_id.
        Populates self.balances { code: debit - credit }.
        """
        query = (
            self.db.query(
                models.Account.code,
                func.coalesce(func.sum(models.EntryLine.debit), 0).label("debit"),
                func.coalesce(func.sum(models.EntryLine.credit), 0).label("credit"),
            )
            .join(models.EntryLine, models.EntryLine.account_id == models.Account.id)
            .join(models.Entry, models.Entry.id == models.EntryLine.entry_id)
            .join(models.Journal, models.Journal.id == models.Entry.journal_id)
            .filter(models.Account.company_id == self.company_id)
            .filter(models.Journal.company_id == self.company_id)
        )

        if self.document_id:
            query = query.filter(models.Entry.document_id == self.document_id)

        query = query.group_by(models.Account.code)

        self.raw = {}
        self.balances = {}
        for row in query.all():
            d = float(row.debit)
            c = float(row.credit)
            self.raw[row.code] = (d, c)
            self.balances[row.code] = d - c

        # Récupération des données extra-comptables (Annexes)
        import json
        annexe_record = self.db.query(models.AnnexeData).filter(models.AnnexeData.company_id == self.company_id).first()
        if annexe_record and annexe_record.data:
            try:
                self.annexe_data = json.loads(annexe_record.data)
            except:
                pass

        self._log.append(
            f"_fetch_balances: {len(self.balances)} accounts loaded, "
            f"{len(self.annexe_data)} annexe variables loaded."
        )

    # ------------------------------------------------------------------
    # 2. RULE ENGINE
    # ------------------------------------------------------------------

    def _get_value_for_mapping(self, rule: str) -> float:
        """
        Parse a mapping rule string and compute the value.
        Supports variables extra-comptables via # (ex: "#nif", "#dirigeant_nom").
        """
        rule = rule.strip()

        # Handle extra-accounting variable
        if rule.startswith("#"):
            var_name = rule[1:]
            val = self.annexe_data.get(var_name, "")
            # Try to cast to float if it looks like a number
            try:
                # Basic check for number format
                if str(val).replace('.', '', 1).isdigit():
                    return float(val)
            except:
                pass
            return val

        # Handle ABS() wrapper
        is_abs = False
        if rule.upper().startswith("ABS(") and rule.endswith(")"):
            is_abs = True
            rule = rule[4:-1]

        total = 0.0
        patterns = [p.strip() for p in rule.split(",") if p.strip()]

        for pattern in patterns:
            multiplier = 1.0
            if pattern.startswith("-"):
                multiplier = -1.0
                pattern = pattern[1:].strip()

            component = 0.0
            if pattern.endswith("*"):
                prefix = pattern[:-1]
                for code, bal in self.balances.items():
                    if code.startswith(prefix):
                        component += bal
            else:
                component = self.balances.get(pattern, 0.0)

            total += component * multiplier

        result = abs(total) if is_abs else total
        # Arrondi à l'entier près (0 décimale) comme exigé par le canevas OTR
        return float(round(result, 0))

    # ------------------------------------------------------------------
    # 3. CELL WRITING (merged-cell safe, formula-safe)
    # ------------------------------------------------------------------

    def _parse_cell_addr(self, addr: str) -> tuple[int, int]:
        """Convert e.g. 'E13' → (row=13, col=5)."""
        col_letters = ""
        row_digits = ""
        for ch in addr:
            if ch.isalpha():
                col_letters += ch
            else:
                row_digits += ch
        return int(row_digits), column_index_from_string(col_letters)

    def inject_value(self, ws, cell_addr: str, value):
        """
        Write value to cell_addr in worksheet ws.
        If the cell belongs to a merged range, write to the top-left master.
        Always replaces any existing text/formula with the numeric value for targeted input cells.
        """
        target_row, target_col = self._parse_cell_addr(cell_addr)

        # Check if this cell is inside a merged range
        for merged_range in ws.merged_cells.ranges:
            if (merged_range.min_row <= target_row <= merged_range.max_row and
                    merged_range.min_col <= target_col <= merged_range.max_col):
                # Write to the top-left master cell of the merged range
                master = ws.cell(row=merged_range.min_row, column=merged_range.min_col)
                master.value = value
                self._log.append(f"  MERGED → {ws.title}!{cell_addr} → master "
                                  f"({get_column_letter(merged_range.min_col)}{merged_range.min_row}) = {value}")
                return

        # Normal (non-merged) cell
        cell = ws.cell(row=target_row, column=target_col)
        old_val = cell.value
        cell.value = value
        self._log.append(
            f"  WRITE  → {ws.title}!{cell_addr} = {value}"
            + (f"  [replaced formula: {str(old_val)[:30]}]" if isinstance(old_val, str) and old_val.startswith("=") else "")
        )

    # ------------------------------------------------------------------
    # 4. REPORT GENERATION & VALIDATION
    # ------------------------------------------------------------------

    def pre_flight_check(self) -> dict:
        """
        Vérification SQL en amont (Pre-flight Check) :
        1. Équilibre Bilan : SUM(Débit) = SUM(Crédit)
        2. Statistiques et identification du Compte 13 (Résultat Net)
        """
        self._fetch_balances()

        total_debit = sum(val[0] for val in self.raw.values())
        total_credit = sum(val[1] for val in self.raw.values())
        
        # Le résultat net se lit généralement sur le compte 13
        resultat_net = None
        for code, bal in self.balances.items():
            if code.startswith('13'):
                resultat_net = bal

        is_balanced = abs(total_debit - total_credit) < 1.0

        return {
            "total_debit": round(total_debit, 2),
            "total_credit": round(total_credit, 2),
            "difference": round(abs(total_debit - total_credit), 2),
            "is_balanced": is_balanced,
            "compte_13_present": resultat_net is not None,
            "resultat_net_13": round(resultat_net, 2) if resultat_net is not None else 0.0,
            "nb_comptes": len(self.balances)
        }

    def validate_totals(self, template_path: str, output_path: str) -> list[str]:
        """
        Vérification post-injection : s'assure qu'aucune cellule contenant originellement
        une formule de =SOMME (Total) n'a été écrasée par erreur.
        """
        wb_template = openpyxl.load_workbook(template_path, data_only=False, read_only=True)
        wb_output = openpyxl.load_workbook(output_path, data_only=False, read_only=True)
        
        errors = []
        for sheet_name in ["BILAN ACTIF", "BILAN PASSIF", "COMPTE DE RESULTAT", "Résultat fiscal"]:
            if sheet_name not in wb_template.sheetnames:
                continue
                
            ws_t = wb_template[sheet_name]
            if sheet_name not in wb_output.sheetnames:
                continue
            ws_o = wb_output[sheet_name]
            
            for row in ws_t.iter_rows(min_row=1, max_row=60, min_col=1, max_col=15):
                for cell in row:
                    val = str(cell.value).strip().upper() if cell.value is not None else ""
                    # On cherche les cellules qui contiennent =SUM ou =SOMME ou autres formules critiques
                    if val.startswith("=SOMME") or val.startswith("=SUM") or val.startswith("=SUBTOTAL") or val.startswith("=SOUS.TOTAL"):
                        out_val = str(ws_o[cell.coordinate].value).strip().upper() if ws_o[cell.coordinate].value is not None else ""
                        if not (out_val.startswith("=SOMME") or out_val.startswith("=SUM") or out_val.startswith("=SUBTOTAL") or out_val.startswith("=SOUS.TOTAL")):
                            errors.append(f"{sheet_name}!{cell.coordinate} (Formule écrasée : {out_val})")
        
        wb_template.close()
        wb_output.close()
        
        if errors:
            self._log.append(f"⚠️ AVERTISSEMENT VALIDATION: {len(errors)} formules de total/somme écrasees: {errors[:5]}")
            print(f"[ExcelInjector] WARN: {len(errors)} formules de TOTAL écrasées !")
        else:
            self._log.append("✅ VALIDATION: Toutes les formules de total (SOMME/SUM/SOUS.TOTAL) sont intactes.")
            print("[ExcelInjector] Validation OK : Formules intactes.")
            
        return errors

    def generate_report(
        self,
        template_path: str,
        output_path: str,
        mapping_config: dict,
    ) -> str:
        """
        Copy the template, inject computed values, save to output_path.
        Returns output_path.
        """
        self._fetch_balances()

        if not self.balances:
            raise ValueError(
                "Aucun solde comptable trouvé pour cette société. "
                "Veuillez d'abord importer une balance générale."
            )

        # Load template — keep_vba=False, read_only=False, data_only=False
        # (do NOT use data_only=True — we want to preserve formulas and macros)
        wb = openpyxl.load_workbook(template_path, keep_vba=False, data_only=False)

        injected = 0
        skipped_sheet = []
        skipped_zero = []

        for cell_ref, rule in mapping_config.items():
            if "!" in cell_ref:
                sheet_name, cell_addr = cell_ref.split("!", 1)
            else:
                sheet_name = wb.active.title
                cell_addr = cell_ref

            if sheet_name not in wb.sheetnames:
                skipped_sheet.append(cell_ref)
                continue

            ws = wb[sheet_name]
            try:
                value = self._get_value_for_mapping(rule)
                # Write ALL mapped values including 0 (so template input zeros aren't kept as formulas)
                self.inject_value(ws, cell_addr, value)
                if value != 0:
                    injected += 1
            except Exception as exc:
                self._log.append(f"  ERROR  → {cell_ref} ({rule}): {exc}")
                print(f"[ExcelInjector] WARN: {cell_ref} ({rule}) → {exc}")

        if skipped_sheet:
            msg = f"[ExcelInjector] Sheets absent du template: {set(skipped_sheet)}"
            self._log.append(msg)
            print(msg)

        print(f"[ExcelInjector] {injected} non-zero values injected into '{output_path}'")
        
        wb.save(output_path)
        
        # Validation Post-injection
        self.validate_totals(template_path, output_path)
        
        return output_path

    @property
    def log(self) -> list[str]:
        return self._log


