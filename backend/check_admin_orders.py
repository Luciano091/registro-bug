import os
from sqlalchemy import create_engine, text

db_url = os.environ["DATABASE_URL"]
engine = create_engine(db_url)

with engine.connect() as conn:
    print("--- Pedidos com responsavel ---")
    res = conn.execute(text("SELECT id, tipo_entrega, responsavel_id FROM pedidos ORDER BY id DESC LIMIT 5")).fetchall()
    for row in res:
        print(row)
