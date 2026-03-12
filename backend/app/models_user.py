from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # --- SaaS Subscription Fields ---
    plan_id = Column(String(36), ForeignKey("subscription_plans.id"), nullable=True)
    plan_status = Column(String(20), default="inactive") # inactive, pending, active, expired
    plan_expires_at = Column(DateTime, nullable=True)
    files_processed_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    plan = relationship("SubscriptionPlan", back_populates="users")
    payment_proofs = relationship("PaymentProof", back_populates="user")


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    price = Column(Float, default=0.0)
    duration_days = Column(Integer, default=30)
    has_ai_access = Column(Boolean, default=False)
    file_limit = Column(Integer, nullable=True) # None = unlimited
    payment_link = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="plan")
    payment_proofs = relationship("PaymentProof", back_populates="plan")


class PaymentProof(Base):
    __tablename__ = "payment_proofs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    plan_id = Column(String(36), ForeignKey("subscription_plans.id"))
    image_path = Column(String)
    status = Column(String(20), default="pending") # pending, approved, rejected
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="payment_proofs")
    plan = relationship("SubscriptionPlan", back_populates="payment_proofs")
