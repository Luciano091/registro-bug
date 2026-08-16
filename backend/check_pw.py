from database import SessionLocal
from models import Configuracao

db = SessionLocal()
config = db.query(Configuracao).first()
if config:
    print(f"Senha atual no DB: {config.senha_admin}")
else:
    print("Nenhuma configuracao encontrada")
