import openpyxl
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
import os
import json

class ExcelInjector:
    def __init__(self, db: Session, company_id: int):
        self.db = db
        self.company_id = company_id
        self.balances = {} # Cache for account balances

    def _fetch_balances(self):
        """Calculates balance for ALL accounts of the company."""
        # Sum Debit/Credit per account
        results = self.db.query(
            models.EntryLine.account_id,
            models.Account.code,
            func.sum(models.EntryLine.debit).label("debit"),
            func.sum(models.EntryLine.credit).label("credit")
        ).join(models.Account).filter(
            models.Account.company_id == self.company_id
        ).group_by(models.EntryLine.account_id, models.Account.code).all()

        for r in results:
            # Solde standard : Debit - Credit. 
            # Note: For Passif/Produits, balance might be negative effectively.
            # We store raw algebraic balance (Debit - Credit).
            self.balances[r.code] = (r.debit or 0) - (r.credit or 0)

    def _get_value_for_mapping(self, mapping_rule: str) -> float:
        """
        Parses a mapping rule and returns the computed value.
        Supported rules:
        - "701": Exact account match
        - "70*": Wildcard match (starts with 70)
        - "SUM(70*, 71*)": Sum of multiple patterns
        - "-601": Negate value
        """
        # Simple implementation V1: Single Pattern or Comma separated
        # "701, 702" -> Sum of 701 and 702
        
        total = 0.0
        patterns = [p.strip() for p in mapping_rule.split(",")]
        
        for p in patterns:
            multiplier = 1
            if p.startswith("-"):
                multiplier = -1
                p = p[1:]
            
            # Wildcard handling
            if p.endswith("*"):
                prefix = p[:-1]
                for code, bal in self.balances.items():
                    if code.startswith(prefix):
                        total += bal * multiplier
            else:
                # Exact match
                total += self.balances.get(p, 0.0) * multiplier
                
        return total

    def generate_report(self, template_path: str, output_path: str, mapping_config: dict):
        """
        Opens template, fills cells based on mapping_config, saves to output.
        mapping_config format: { "Sheet1!F12": "701", "Sheet1!F13": "601" }
        """
        self._fetch_balances()
        
        wb = openpyxl.load_workbook(template_path)
        
        for cell_ref, rule in mapping_config.items():
            # Parse Sheet!Cell
            if "!" in cell_ref:
                sheet_name, cell_addr = cell_ref.split("!")
            else:
                sheet_name, cell_addr = wb.active.title, cell_ref
            
            if sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                try:
                    value = self._get_value_for_mapping(rule)
                    # Write value (only if not 0, or maybe write 0?)
                    # Let's write standard float
                    ws[cell_addr] = value
                except Exception as e:
                    print(f"Error filling {cell_ref} with rule {rule}: {e}")
            else:
                print(f"Sheet {sheet_name} not found")

        wb.save(output_path)
        return output_path
