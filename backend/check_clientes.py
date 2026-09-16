import os
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres.fkyradvexnmpdjbeveir:3Pj%2AyvP%23BD.nTSR@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
engine = create_engine(db_url)

with engine.connect() as conn:
    print("--- Clientes cadastrados ---")
    res = conn.execute(text("SELECT id, nome, email, google_id FROM clientes")).fetchall()
    for row in res:
        print(row)
