import os
from sqlalchemy import create_engine, text

db_url = os.environ["DATABASE_URL"]
engine = create_engine(db_url)

with engine.connect() as conn:
    print("--- Itens dos últimos 3 pedidos ---")
    res = conn.execute(text("SELECT p.id as pedido_id, p.total, pi.produto_nome, pi.quantidade, pi.valor_unitario, pi.subtotal FROM pedidos p JOIN itens_pedido pi ON p.id = pi.pedido_id ORDER BY p.id DESC LIMIT 10")).fetchall()
    for row in res:
        print(row)
