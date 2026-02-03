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

class EntryCreate(EntryBase):
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

