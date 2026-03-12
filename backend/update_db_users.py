from app.database import engine
from sqlalchemy import text

statements = [
    "ALTER TABLE users ADD COLUMN plan_id VARCHAR(36);",
    "ALTER TABLE users ADD COLUMN plan_status VARCHAR(20) DEFAULT 'inactive';",
    "ALTER TABLE users ADD COLUMN plan_expires_at TIMESTAMP;",
    "ALTER TABLE users ADD COLUMN files_processed_count INTEGER DEFAULT 0;"
]

for stmt in statements:
    try:
        with engine.begin() as conn:
            conn.execute(text(stmt))
    except Exception as e:
        print(f"Failed {stmt}: {e}")

print("Update finished")
