from app.database import SessionLocal, engine
from app import models_user
from app.auth_utils import get_password_hash

# Ensure tables exist
models_user.Base.metadata.create_all(bind=engine)

db = SessionLocal()

email = "admin@auditia.com"
password = "admin"
full_name = "Administrateur"

user = db.query(models_user.User).filter(models_user.User.email == email).first()
if not user:
    print(f"Creating default user: {email}")
    hashed_password = get_password_hash(password)
    new_user = models_user.User(email=email, hashed_password=hashed_password, full_name=full_name, is_superuser=True)
    db.add(new_user)
    db.commit()
else:
    print(f"User {email} already exists.")

db.close()
