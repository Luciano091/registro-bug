import os
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres.fkyradvexnmpdjbeveir:3Pj%2AyvP%23BD.nTSR@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
engine = create_engine(db_url)

with engine.connect() as conn:
    print("--- Pedidos com responsavel ---")
    res = conn.execute(text("SELECT id, tipo_entrega, responsavel_id FROM pedidos ORDER BY id DESC LIMIT 5")).fetchall()
    for row in res:
        print(row)
