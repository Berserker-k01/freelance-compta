from fastapi import FastAPI

app = FastAPI(title="Auditia API", version="2.0.0")

from .database import engine, Base
from . import models
from .routers import accounting, audit, auth, safe, reports

# Create tables
Base.metadata.create_all(bind=engine)

app.include_router(accounting.router)
app.include_router(audit.router)
app.include_router(auth.router)
app.include_router(safe.router)
app.include_router(reports.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Auditia API v2 (Cloud-Native)"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
