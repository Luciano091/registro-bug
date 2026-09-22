import os
from sqlalchemy import create_engine, text

db_url = os.environ["DATABASE_URL"]
engine = create_engine(db_url)

with engine.connect() as conn:
    print("\n--- 5. Detalhes dos últimos 5 pedidos ---")
    res = conn.execute(text("SELECT id, cliente_id, cliente, telefone, endereco, forma_pagamento, total, status FROM pedidos ORDER BY id DESC LIMIT 5")).fetchall()
    for row in res:
        print(row)
