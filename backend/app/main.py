from fastapi import FastAPI

app = FastAPI(title="Auditia API", version="2.0.0")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev, or ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .database import engine, Base
from . import models, models_user  # models_user ensures users table is created
from .routers import accounting, audit, auth, safe, reports, dashboard, templates, companies, documents, licenses

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app.include_router(accounting.router)
app.include_router(audit.router)
app.include_router(auth.router)
app.include_router(safe.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(templates.router)
app.include_router(companies.router)
app.include_router(documents.router)
app.include_router(licenses.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Auditia API v2 (Cloud-Native)"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
