from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- ACCOUNT SCHEMAS ---
class AccountBase(BaseModel):
    code: str
    name: str
    class_code: int
    is_active: Optional[bool] = True

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: int
    company_id: int
    
    class Config:
        from_attributes = True

# --- LICENSE SCHEMAS ---
class LicenseBase(BaseModel):
    client_name: str
    max_workstations: int = 1
    duration_days: int = 365

class LicenseCreate(LicenseBase):
    pass

class LicenseActivationBase(BaseModel):
    machine_id: str
    machine_name: Optional[str] = None

class LicenseActivationCreate(LicenseActivationBase):
    key: str # License key to activate against

class LicenseActivationOut(LicenseActivationBase):
    id: int
    activated_at: datetime
    ip_address: Optional[str] = None
    
    class Config:
        from_attributes = True

class LicenseOut(BaseModel):
    id: int
    key: str
    client_name: str
    max_workstations: int
    expiration_date: datetime
    is_active: bool
    created_at: datetime
    
    # Nested activations
    activations: List[LicenseActivationOut] = []
    
    class Config:
        from_attributes = True

class LicenseActivate(BaseModel):
    key: str
    machine_id: str
    machine_name: Optional[str] = "Unknown PC"

# --- JOURNAL SCHEMAS ---
class JournalBase(BaseModel):
    code: str
    name: str

class JournalCreate(JournalBase):
    pass

class Journal(JournalBase):
    id: int
    company_id: int

    class Config:
        from_attributes = True

# --- ENTRY SCHEMAS ---
class EntryLineBase(BaseModel):
    account_id: int
    debit: float = 0.0
    credit: float = 0.0
    label: Optional[str] = None

class EntryLineCreate(EntryLineBase):
    pass

class EntryLine(EntryLineBase):
    id: int
    entry_id: int

    class Config:
        from_attributes = True

class EntryBase(BaseModel):
    date: datetime
    reference: str
    label: str
    journal_id: int
    document_id: Optional[int] = None

class EntryCreate(EntryBase):
    company_id: Optional[int] = None  # Sent from frontend, resolved via journal
    lines: List[EntryLineCreate]

class Entry(EntryBase):
    id: int
    validated: bool
    created_at: datetime
    lines: List[EntryLine] = []

    class Config:
        from_attributes = True

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- TEMPLATE SCHEMAS ---
class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    country: str
    year: int
    mapping_config: Optional[str] = "{}"

class TemplateCreate(TemplateBase):
    pass

class Template(TemplateBase):
    id: int
    file_path: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- COMPANY SCHEMAS ---
class CompanyBase(BaseModel):
    name: str
    tax_id: str
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = "active"

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- DOCUMENT SCHEMAS ---
class DocumentBase(BaseModel):
    name: str
    file_type: str

class DocumentCreate(DocumentBase):
    pass

class Document(DocumentBase):
    id: int
    filename: str
    file_path: str
    created_at: datetime
    company_id: int
    
    class Config:
        from_attributes = True

