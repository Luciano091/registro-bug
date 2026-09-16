import os
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres.fkyradvexnmpdjbeveir:3Pj%2AyvP%23BD.nTSR@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
engine = create_engine(db_url)

with engine.connect() as conn:
    print("\n--- 5. Detalhes dos últimos 5 pedidos ---")
    res = conn.execute(text("SELECT id, cliente_id, cliente, telefone, endereco, forma_pagamento, total, status FROM pedidos ORDER BY id DESC LIMIT 5")).fetchall()
    for row in res:
        print(row)
