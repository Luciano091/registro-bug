from database import engine, Base
from models import Insumo, ProdutoInsumo

print("Creating new tables...")
Insumo.__table__.create(bind=engine, checkfirst=True)
ProdutoInsumo.__table__.create(bind=engine, checkfirst=True)
print("Tables created successfully.")
