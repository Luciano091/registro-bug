from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models

DEFAULT_DB_URL = "postgresql://neondb_owner:npg_PJaA6coCD2QY@ep-little-tree-ac1havuv-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DEFAULT_DB_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

contato = db.query(models.WhatsAppContato).filter(models.WhatsAppContato.telefone == "5511999999999").first()
if contato:
    old_interacao = contato.ultima_interacao
    now = models.get_now()
    print("Old:", old_interacao)
    print("Now:", now)
    
    if old_interacao:
        time_diff = now - old_interacao
        print("Diff total seconds:", time_diff.total_seconds())
        if time_diff.total_seconds() > 2 * 3600:
            print("Should reply! > 2 hours")
        else:
            print("NO REPLY! < 2 hours")

db.close()
