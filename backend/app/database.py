from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

POSTGRES_USER = os.getenv("POSTGRES_USER", "auditia_admin")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "secure_password_2026")
POSTGRES_DB = os.getenv("POSTGRES_DB", "auditia_core")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

# Prioritize DATABASE_URL if in environment (Docker)
env_db_url = os.getenv("DATABASE_URL")
if env_db_url:
    DATABASE_URL = env_db_url
else:
    DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
