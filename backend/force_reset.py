import sys
sys.path.append('.')
from database import SessionLocal
import models
import auth

db = SessionLocal()
config = db.query(models.Configuracao).first()
if config:
    print(f"DEBUG: A senha no banco era '{config.senha_admin}'")
    config.senha_admin = auth.get_password_hash("burger123")
    db.commit()
    print("SUCESSO: A senha foi resetada e blindada para 'burger123'.")
else:
    print("ERRO: Nenhuma configuração encontrada no banco.")
db.close()
