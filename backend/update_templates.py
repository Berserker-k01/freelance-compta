from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE report_templates ADD COLUMN user_id VARCHAR(36);"))
        conn.commit()
        print("Column user_id added to report_templates.")
    except Exception as e:
        print(f"Error (maybe column exists): {e}")

    try:
        conn.execute(text("UPDATE report_templates SET user_id = (SELECT id from users WHERE email='admin@auditia.com' LIMIT 1) WHERE user_id IS NULL;"))
        conn.commit()
        print("Orphaned templates linked to admin@auditia.com.")
    except Exception as e:
        print(f"Error updating orphaned templates: {e}")
