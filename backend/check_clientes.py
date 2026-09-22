import os
from sqlalchemy import create_engine, text

db_url = os.environ["DATABASE_URL"]
engine = create_engine(db_url)

with engine.connect() as conn:
    print("--- Clientes cadastrados ---")
    res = conn.execute(text("SELECT id, nome, email, google_id FROM clientes")).fetchall()
    for row in res:
        print(row)
