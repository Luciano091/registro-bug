from database import engine
from sqlalchemy import text

tables_to_drop = [
    "produto_grupos_opcoes", "itens_pedido_opcoes", "setores_producao",
    "comanda_itens", "comanda_pagamentos", "fila_cozinha"
]

with engine.begin() as conn:
    for table in tables_to_drop:
        try:
            conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
            print(f"Dropped {table}")
        except Exception as e:
            print(f"Error dropping {table}: {e}")
