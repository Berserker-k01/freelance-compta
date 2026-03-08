from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class AccountType(str, enum.Enum):
    ASSET = "ASSET"           # Actif
    LIABILITY = "LIABILITY"   # Passif
    EQUITY = "EQUITY"         # Capitaux propres
    REVENUE = "REVENUE"       # Produits
    EXPENSE = "EXPENSE"       # Charges

class License(Base):
    """Licences Commerciales"""
    __tablename__ = "licenses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String, unique=True, index=True)
    client_name = Column(String)
    max_workstations = Column(Integer, default=1)
    expiration_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    activations = relationship("LicenseActivation", back_populates="license", cascade="all, delete-orphan")

class LicenseActivation(Base):
    """Postes activés sur une licence"""
    __tablename__ = "license_activations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    license_id = Column(String(36), ForeignKey("licenses.id"))
    
    machine_id = Column(String, index=True) # Hardware ID unique
    machine_name = Column(String, nullable=True) # "PC de Jean"
    ip_address = Column(String, nullable=True)
    
    activated_at = Column(DateTime, default=datetime.utcnow)
    
    license = relationship("License", back_populates="activations")

class Company(Base):
    __tablename__ = "companies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    tax_id = Column(String, unique=True, index=True) # NIF
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    status = Column(String, default="active") # active, closed, archived
    
    # Relations
    accounts = relationship("Account", back_populates="company", cascade="all, delete-orphan")
    journals = relationship("Journal", back_populates="company", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="company", cascade="all, delete-orphan")
    annexe_data = relationship("AnnexeData", back_populates="company", uselist=False, cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Account(Base):
    """Plan Comptable (SYSCOHADA)"""
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String, index=True) # Ex: 411
    name = Column(String) # Ex: Clients
    class_code = Column(Integer) # Classe 1 à 9
    
    is_active = Column(Boolean, default=True)
    
    company_id = Column(String(36), ForeignKey("companies.id"))
    company = relationship("Company", back_populates="accounts")

    entries = relationship("EntryLine", back_populates="account")

class Journal(Base):
    """Journaux Comptables (Achats, Ventes, Bq, OD...)"""
    __tablename__ = "journals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String, index=True) # Ex: ACH, VTE, BQ1
    name = Column(String) 
    
    company_id = Column(String(36), ForeignKey("companies.id"))
    company = relationship("Company", back_populates="journals")
    
    entries = relationship("Entry", back_populates="journal", cascade="all, delete-orphan")

class Entry(Base):
    """Une écriture comptable (Header)"""
    __tablename__ = "entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    date = Column(DateTime, index=True)
    reference = Column(String, index=True) # Numéro de pièce
    label = Column(String) # Libellé
    
    journal_id = Column(String(36), ForeignKey("journals.id"))
    journal = relationship("Journal", back_populates="entries")

    document_id = Column(String(36), ForeignKey("documents.id"), nullable=True)
    document = relationship("Document", back_populates="entries")
    
    lines = relationship("EntryLine", back_populates="entry", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    validated = Column(Boolean, default=False) # Validé = plus modifiable (loi anti-fraude)

class EntryLine(Base):
    """Ligne d'écriture (Debit/Credit)"""
    __tablename__ = "entry_lines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    
    entry_id = Column(String(36), ForeignKey("entries.id"))
    entry = relationship("Entry", back_populates="lines")
    
    account_id = Column(String(36), ForeignKey("accounts.id"))
    account = relationship("Account", back_populates="entries")
    
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    
    label = Column(String, nullable=True) # Libellé ligne si différent entête

class ReportTemplate(Base):
    """Modèles de Liasses Fiscales (Excel + Mapping)"""
    __tablename__ = "report_templates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String, index=True) # Ex: "Liasse GUDEF Togo 2026"
    description = Column(String, nullable=True)
    
    country = Column(String) # Ex: "TOGO"
    year = Column(Integer) # Ex: 2026
    
    file_path = Column(String) # Path to stored .xlsx
    
    # Configuration JSON: { "F14": "101,102", "G14": "131" }
    mapping_config = Column(String, default="{}") 
    
    created_at = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    """Fichiers stockés (Balances, Justificatifs, etc.)"""
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    filename = Column(String)
    file_path = Column(String)
    file_type = Column(String) # "balance", "other"
    
    company_id = Column(String(36), ForeignKey("companies.id"))
    company = relationship("Company", back_populates="documents")
    entries = relationship("Entry", back_populates="document")
    
    created_at = Column(DateTime, default=datetime.utcnow)

class AnnexeData(Base):
    """Données Extra-Comptables (Module 4 & 5)"""
    __tablename__ = "annexe_data"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), unique=True)
    company = relationship("Company", back_populates="annexe_data")
    
    data = Column(String, default="{}") # JSON stocké en String
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
