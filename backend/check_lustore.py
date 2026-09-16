from sqlalchemy.orm import Session
from database import SessionLocal
import models
db = SessionLocal()
est = db.query(models.Estabelecimento).all()
print([(e.id, e.nome, e.slug) for e in est])
