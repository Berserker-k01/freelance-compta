from app.database import SessionLocal
from app import models

db = SessionLocal()

# Check for existing company
company = db.query(models.Company).filter(models.Company.id == 1).first()

if not company:
    print("Seeding Default Company (ID=1)...")
    company = models.Company(
        id=1,
        name="Ma Société",
        tax_id="0001-A",
        address="Lomé, Togo",
        city="Lomé",
        email="contact@auditia.com"
    )
    db.add(company)
    db.commit()
    print("Default Company created successfully.")
else:
    print("Default Company (ID=1) already exists.")

db.close()
