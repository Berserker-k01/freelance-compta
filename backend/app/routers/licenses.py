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
    expiration = datetime.utcnow() + timedelta(days=license_data.duration_days)
    key = generate_license_key()
    
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

@router.post("/activate", response_model=schemas.LicenseActivationOut)
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
        
    # Check if this machine is already activated
    existing_activation = db.query(models.LicenseActivation).filter(
        models.LicenseActivation.license_id == license.id,
        models.LicenseActivation.machine_id == activation.machine_id
    ).first()
    
    if existing_activation:
        return existing_activation
    
    # Check max workstations
    current_count = db.query(models.LicenseActivation).filter(models.LicenseActivation.license_id == license.id).count()
    if current_count >= license.max_workstations:
        raise HTTPException(status_code=403, detail=f"Nombre maximum de postes atteint ({license.max_workstations}).")
    
    # Create new activation
    new_activation = models.LicenseActivation(
        license_id=license.id,
        machine_id=activation.machine_id,
        machine_name=activation.machine_name,
        activated_at=datetime.utcnow()
    )
    
    db.add(new_activation)
    db.commit()
    db.refresh(new_activation)
    
    return new_activation

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
         
    # Check activation record
    activation = db.query(models.LicenseActivation).filter(
        models.LicenseActivation.license_id == license.id,
        models.LicenseActivation.machine_id == machine_id
    ).first()
    
    if not activation:
         raise HTTPException(status_code=403, detail="Licence non activée sur ce poste.")
         
    return {"status": "valid", "days_remaining": (license.expiration_date - datetime.utcnow()).days, "workstations_used": len(license.activations), "max_workstations": license.max_workstations}

@router.get("/info/{key}", response_model=schemas.LicenseOut)
def get_license_info(key: str, db: Session = Depends(get_db)):
    """
    Get detailed license info for Settings page.
    """
    license = db.query(models.License).filter(models.License.key == key).first()
    if not license:
        raise HTTPException(status_code=404, detail="Licence introuvable.")
    return license

@router.delete("/revoke/{activation_id}")
def revoke_activation(activation_id: int, db: Session = Depends(get_db)):
    """
    Revoke a specific activation (release a seat).
    """
    activation = db.query(models.LicenseActivation).filter(models.LicenseActivation.id == activation_id).first()
    if not activation:
        raise HTTPException(status_code=404, detail="Activation not found")
        
    db.delete(activation)
    db.commit()
    return {"message": "Activation revoked"}
