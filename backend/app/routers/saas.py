from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os
import shutil

from .. import schemas, models_user as models
from ..database import get_db
from ..auth_utils import get_current_user, get_current_superuser

router = APIRouter(
    prefix="/saas",
    tags=["saas"],
)

# --- PUBLIC/USER ROUTES ---

@router.get("/plans", response_model=List[schemas.SubscriptionPlan])
def get_plans(db: Session = Depends(get_db)):
    """Fetch all available subscription plans."""
    return db.query(models.SubscriptionPlan).all()

@router.post("/upload-proof")
def upload_payment_proof(
    plan_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """User uploads proof of payment for a plan."""
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "proofs")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"proof_{current_user.id}_{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    proof = models.PaymentProof(
        user_id=current_user.id,
        plan_id=plan_id,
        image_path=safe_filename,
        status="pending"
    )
    db.add(proof)
    
    # Update user status
    current_user.plan_status = "pending"
    current_user.plan_id = plan_id
    
    db.commit()
    return {"message": "Proof uploaded successfully", "status": "pending"}

@router.get("/me", response_model=schemas.UserOut)
def get_my_subscription(current_user: models.User = Depends(get_current_user)):
    """Get current user subscription status"""
    plan = current_user.plan
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "plan_id": current_user.plan_id,
        "plan_name": plan.name if plan else None,
        "plan_has_ai_access": bool(plan.has_ai_access) if plan else False,
        "plan_file_limit": plan.file_limit if plan else None,
        "plan_status": current_user.plan_status,
        "plan_expires_at": current_user.plan_expires_at,
        "files_processed_count": current_user.files_processed_count or 0,
        "created_at": current_user.created_at,
    }


# --- ADMIN ROUTES ---

@router.post("/admin/plans", response_model=schemas.SubscriptionPlan)
def create_plan(
    plan: schemas.SubscriptionPlanCreate, 
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_superuser)
):
    """Admin creates a new subscription plan."""
    db_plan = models.SubscriptionPlan(**plan.model_dump())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.put("/admin/plans/{plan_id}", response_model=schemas.SubscriptionPlan)
def update_plan(
    plan_id: str,
    plan_update: schemas.SubscriptionPlanCreate, 
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_superuser)
):
    """Admin updates an existing plan."""
    db_plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    for key, value in plan_update.model_dump().items():
        setattr(db_plan, key, value)
        
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.get("/admin/users", response_model=List[schemas.UserOut])
def get_all_users(
    skip: int = 0, limit: int = 100, 
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_superuser)
):
    """Admin views all users."""
    return db.query(models.User).offset(skip).limit(limit).all()

@router.post("/admin/users/{user_id}/assign-plan")
def assign_user_plan(
    user_id: str,
    plan_id: str,
    status: str = "active",
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_superuser)
):
    """Admin manually assigns a plan to a user."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    user.plan_id = plan.id
    user.plan_status = status
    if status == "active":
        user.plan_expires_at = datetime.utcnow() + timedelta(days=plan.duration_days)
        
    db.commit()
    return {"message": "Plan assigned successfully", "user_id": user.id, "plan_id": plan.id}

# Also need route to get proofs and approve/reject
@router.get("/admin/proofs")
def get_payment_proofs(
    status: str = "pending",
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_superuser)
):
    proofs = db.query(models.PaymentProof).filter(models.PaymentProof.status == status).all()
    res = []
    for p in proofs:
        user = db.query(models.User).filter(models.User.id == p.user_id).first()
        plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == p.plan_id).first()
        res.append({
            "id": p.id,
            "user_email": user.email if user else "Unknown",
            "plan_name": plan.name if plan else "Unknown",
            "image_path": p.image_path,
            "status": p.status,
            "created_at": p.created_at
        })
    return res

@router.post("/admin/proofs/{proof_id}/review")
def review_payment_proof(
    proof_id: str,
    action: str, # "approve" or "reject"
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_superuser)
):
    proof = db.query(models.PaymentProof).filter(models.PaymentProof.id == proof_id).first()
    if not proof:
        raise HTTPException(status_code=404, detail="Proof not found")
        
    user = db.query(models.User).filter(models.User.id == proof.user_id).first()
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == proof.plan_id).first()
    
    if action == "approve":
        proof.status = "approved"
        if user and plan:
            user.plan_id = plan.id
            user.plan_status = "active"
            user.plan_expires_at = datetime.utcnow() + timedelta(days=plan.duration_days)
    elif action == "reject":
        proof.status = "rejected"
        if user:
            user.plan_status = "inactive"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    db.commit()
    return {"message": f"Proof {action}d successfully"}

@router.post("/admin/upload-exe")
def upload_executable(
    file: UploadFile = File(...),
    admin: models.User = Depends(get_current_superuser)
):
    """Admin uploads a new version of the downloadable EXE."""
    DOWNLOAD_DIR = "/app/public_downloads"
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR, exist_ok=True)
        
    file_path = os.path.join(DOWNLOAD_DIR, "auditia-setup-1.0.0.exe") # Forcing the name for simplicity
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"message": "Executable uploaded successfully", "filename": "auditia-setup-1.0.0.exe"}

@router.delete("/admin/upload-exe")
def delete_executable(
    admin: models.User = Depends(get_current_superuser)
):
    """Admin deletes the downloadable EXE."""
    DOWNLOAD_DIR = "/app/public_downloads"
    file_path = os.path.join(DOWNLOAD_DIR, "auditia-setup-1.0.0.exe")
    
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"message": "Executable deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Executable not found")
