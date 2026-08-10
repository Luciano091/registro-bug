import sys
import os

# Add the backend path so we can import from database
sys.path.append(os.path.abspath('backend'))

from backend.database import SessionLocal
from backend.models import Configuracao

db = SessionLocal()
config = db.query(Configuracao).first()

if config:
    print(f"Configuracao encontrada!")
    print(f"ID: {config.id}")
    print(f"Senha Admin atual: {config.senha_admin}")
else:
    print("Nenhuma configuracao encontrada!")

db.close()
