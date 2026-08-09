import sys
sys.path.append('.')
from database import SessionLocal
import models
import auth

db = SessionLocal()
config = db.query(models.Configuracao).first()
if config:
    print(f"Senha atual no DB era: {config.senha_admin}")
    config.senha_admin = auth.get_password_hash("burger123")
    db.commit()
    print("Senha resetada para 'burger123' (com hash) com sucesso!")
else:
    print("Configuração não encontrada no banco!")
db.close()
