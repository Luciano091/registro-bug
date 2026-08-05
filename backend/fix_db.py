from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import WhatsAppContato
import datetime

DEFAULT_DB_URL = "postgresql://neondb_owner:npg_PJaA6coCD2QY@ep-little-tree-ac1havuv-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DEFAULT_DB_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

for c in db.query(WhatsAppContato).filter(WhatsAppContato.ultima_interacao == None).all():
    c.ultima_interacao = datetime.datetime.utcnow()
    db.commit()
    print("Fixed contact:", c.id)

db.close()
