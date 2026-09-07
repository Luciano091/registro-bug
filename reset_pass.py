import sys
import os

# Add the backend path so we can import from database
sys.path.append(os.path.abspath('backend'))

from sqlalchemy import create_engine, text
from backend.auth import get_password_hash

DB_URL = os.environ["DATABASE_URL"]
engine = create_engine(DB_URL)

new_password = os.environ["NEW_ADMIN_PASSWORD"]
new_hash = get_password_hash(new_password)

with engine.begin() as conn:
    conn.execute(text("UPDATE configuracoes SET senha_admin = :hash WHERE id = 1"), {"hash": new_hash})

print("Senha administrativa atualizada com sucesso.")
