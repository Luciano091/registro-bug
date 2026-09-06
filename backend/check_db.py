import os
from sqlalchemy import create_engine, text

db_url = "postgresql://neondb_owner:npg_PJaA6coCD2QY@ep-little-tree-ac1havuv-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(db_url)

with engine.connect() as conn:
    try:
        res = conn.execute(text("SELECT COUNT(*) FROM produtos"))
        print("Produtos count:", res.scalar())
        
        res = conn.execute(text("SELECT COUNT(*) FROM categorias"))
        print("Categorias count:", res.scalar())
        
        res = conn.execute(text("SELECT * FROM configuracoes"))
        print("Configuracoes:", res.fetchall())
    except Exception as e:
        print("Error:", e)
