import sys
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_PJaA6coCD2QY@ep-little-tree-ac1havuv-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, senha_admin FROM configuracoes"))
    for row in result:
        print(f"ID: {row[0]}, Senha Admin (hash): {row[1]}")

