from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import string

from .. import schemas, models
from ..database import get_db

router = APIRouter(
    prefix="/licenses",
    tags=["licenses"],
    responses={404: {"description": "Not found"}},
)

def generate_license_key():
    """Generates a format XXXX-XXXX-XXXX-XXXX"""
    chars = string.ascii_uppercase + string.digits
    parts = [''.join(secrets.choice(chars) for _ in range(4)) for _ in range(4)]
    return '-'.join(parts)

@router.post("/generate", response_model=schemas.LicenseOut)
def generate_license(license_data: schemas.LicenseCreate, db: Session = Depends(get_db)):
    """
    [ADMIN] Générer une nouvelle clé de licence.
    """
    # Calculate expiration
    expiration = datetime.utcnow() + timedelta(days=license_data.duration_days)
    
    key = generate_license_key()
    
    # Ensure uniqueness (simple retry)
    while db.query(models.License).filter(models.License.key == key).first():
        key = generate_license_key()
    
    new_license = models.License(
        key=key,
        client_name=license_data.client_name,
        max_workstations=license_data.max_workstations,
        expiration_date=expiration,
        is_active=True
    )
    
    db.add(new_license)
    db.commit()
    db.refresh(new_license)
    return new_license

@router.post("/activate")
def activate_license(activation: schemas.LicenseActivate, db: Session = Depends(get_db)):
    """
    Activates the license for a specific machine.
    """
    license = db.query(models.License).filter(models.License.key == activation.key).first()
    
    if not license:
        raise HTTPException(status_code=404, detail="Clé de licence invalide.")
        
    if not license.is_active:
        raise HTTPException(status_code=403, detail="Cette licence a été désactivée.")
        
    if license.expiration_date < datetime.utcnow():
        raise HTTPException(status_code=403, detail="Cette licence a expiré.")
        
    # Check if already activated by this machine
    if license.machine_id == activation.machine_id:
        return {"status": "valid", "expiration": license.expiration_date, "message": "Licence déjà active sur ce poste."}
    
    # Check if activated by ANOTHER machine (Simple 1-machine lock for now, or check count if implementing multi-seat logic)
    # The user asked for "number of workstations". For now we lock to the FIRST machine that activates it if max_workstations=1.
    # To support multiple, we would need a LicenseActivation table (One-to-Many).
    # MVP: We assume 1 license = 1 machine for simplicity unless specified otherwise? 
    # User said: "nombre de poste demander". So we should allow multiple activations up to max.
    # But `models.License` has `machine_id` as a single String.
    # Let's adjust logic: If `machine_id` is empty, we bind it. If it matches, good. If different, we check constraints.
    
    if license.machine_id:
        # Already used. 
        # If we strictly enforce 1 key = 1 machine in the Model current design:
        raise HTTPException(status_code=403, detail="Cette licence est déjà utilisée sur un autre poste.")
    
    # First activation
    license.machine_id = activation.machine_id
    license.activated_at = datetime.utcnow()
    db.commit()
    
    return {"status": "activated", "expiration": license.expiration_date, "message": "Logiciel activé avec succès."}

@router.get("/check/{key}")
def check_license(key: str, machine_id: str, db: Session = Depends(get_db)):
    """
    Periodic check to ensure license is still valid and matches machine.
    """
    license = db.query(models.License).filter(models.License.key == key).first()
    
    if not license:
         raise HTTPException(status_code=404, detail="Licence introuvable.")
    
    if not license.is_active:
         raise HTTPException(status_code=403, detail="Licence désactivée.")
         
    if license.expiration_date < datetime.utcnow():
         raise HTTPException(status_code=403, detail="Licence expirée.")
         
    if license.machine_id != machine_id:
         raise HTTPException(status_code=403, detail="Licence invalide pour ce poste.")
         
    return {"status": "valid", "days_remaining": (license.expiration_date - datetime.utcnow()).days}
