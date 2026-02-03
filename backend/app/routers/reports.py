from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from .. import otr_generator
from ..database import get_db

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
)

@router.get("/otr/{company_id}")
def download_liasse_otr(company_id: int, db: Session = Depends(get_db)):
    """Generate and download the OTR tax bundle (Excel)."""
    file_path = otr_generator.generate_balance_sheet(db, company_id)
    return FileResponse(path=file_path, filename=f"Liasse_OTR_Auditia.xlsx", media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@router.post("/generate/{template_id}/{company_id}")
def generate_custom_report(template_id: int, company_id: int, db: Session = Depends(get_db)):
    """Generate a report based on a custom Excel template."""
    from .. import models
    from ..services.injector import ExcelInjector
    import json
    import os

    # 1. Get Template
    template = db.query(models.ReportTemplate).filter(models.ReportTemplate.id == template_id).first()
    if not template:
        return {"error": "Template not found"}

    # 2. Get Mapping (Parse JSON)
    try:
        mapping = json.loads(template.mapping_config)
    except:
        mapping = {}

    # 3. Define Output Path
    output_filename = f"Generated_{template.name}_{company_id}.xlsx"
    output_path = f"/tmp/{output_filename}" # Use tmp for now

    # 4. Run Injector
    injector = ExcelInjector(db, company_id)
    try:
        injector.generate_report(template.file_path, output_path, mapping)
    except Exception as e:
         return {"error": f"Generation failed: {str(e)}"}

    # 5. Return File
    return FileResponse(path=output_path, filename=output_filename, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
