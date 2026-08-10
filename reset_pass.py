import sys
import os

# Add the backend path so we can import from database
sys.path.append(os.path.abspath('backend'))

from sqlalchemy import create_engine, text
from backend.auth import get_password_hash

DB_URL = "postgresql://neondb_owner:npg_PJaA6coCD2QY@ep-little-tree-ac1havuv-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DB_URL)

new_hash = get_password_hash("burger123")

with engine.begin() as conn:
    conn.execute(text("UPDATE configuracoes SET senha_admin = :hash WHERE id = 1"), {"hash": new_hash})

print(f"Senha Admin resetada para 'burger123'. Novo hash: {new_hash}")
