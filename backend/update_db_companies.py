from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE companies ADD COLUMN user_id VARCHAR(36);"))
        conn.commit()
        print("Added user_id column.")
    except Exception as e:
        print(f"Column might already exist: {e}")
        
    try:
        conn.execute(text("UPDATE companies set user_id = (SELECT id from users WHERE email='admin@auditia.com' LIMIT 1) WHERE user_id IS NULL;"))
        conn.commit()
        print("Orphaned companies linked to admin@auditia.com.")
    except Exception as e:
        print(f"Error updating orphaned companies: {e}")
