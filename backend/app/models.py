from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .database import Base

class AccountType(str, enum.Enum):
    ASSET = "ASSET"           # Actif
    LIABILITY = "LIABILITY"   # Passif
    EQUITY = "EQUITY"         # Capitaux propres
    REVENUE = "REVENUE"       # Produits
    EXPENSE = "EXPENSE"       # Charges

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    tax_id = Column(String, unique=True, index=True) # NIF
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    # Relations
    accounts = relationship("Account", back_populates="company")
    journals = relationship("Journal", back_populates="company")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Account(Base):
    """Plan Comptable (SYSCOHADA)"""
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, index=True) # Ex: 411
    name = Column(String) # Ex: Clients
    class_code = Column(Integer) # Classe 1 à 9
    
    is_active = Column(Boolean, default=True)
    
    company_id = Column(Integer, ForeignKey("companies.id"))
    company = relationship("Company", back_populates="accounts")

    entries = relationship("EntryLine", back_populates="account")

class Journal(Base):
    """Journaux Comptables (Achats, Ventes, Bq, OD...)"""
    __tablename__ = "journals"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, index=True) # Ex: ACH, VTE, BQ1
    name = Column(String) 
    
    company_id = Column(Integer, ForeignKey("companies.id"))
    company = relationship("Company", back_populates="journals")
    
    entries = relationship("Entry", back_populates="journal")

class Entry(Base):
    """Une écriture comptable (Header)"""
    __tablename__ = "entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, index=True)
    reference = Column(String, index=True) # Numéro de pièce
    label = Column(String) # Libellé
    
    journal_id = Column(Integer, ForeignKey("journals.id"))
    journal = relationship("Journal", back_populates="entries")
    
    lines = relationship("EntryLine", back_populates="entry", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    validated = Column(Boolean, default=False) # Validé = plus modifiable (loi anti-fraude)

class EntryLine(Base):
    """Ligne d'écriture (Debit/Credit)"""
    __tablename__ = "entry_lines"

    id = Column(Integer, primary_key=True, index=True)
    
    entry_id = Column(Integer, ForeignKey("entries.id"))
    entry = relationship("Entry", back_populates="lines")
    
    account_id = Column(Integer, ForeignKey("accounts.id"))
    account = relationship("Account", back_populates="entries")
    
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    
    label = Column(String, nullable=True) # Libellé ligne si différent entête
