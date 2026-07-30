from backend.database import SessionLocal
from backend import models

db = SessionLocal()
produtos = [
    {"nome": "X-Burger", "preco": 28.00, "categoria": "Hamburguer"},
    {"nome": "X-Salada", "preco": 30.00, "categoria": "Hamburguer"},
    {"nome": "X-Bacon", "preco": 33.00, "categoria": "Hamburguer"},
    {"nome": "Batata Frita", "preco": 15.00, "categoria": "Acompanhamento"},
    {"nome": "Refrigerante Lata", "preco": 7.00, "categoria": "Bebida"}
]

for p in produtos:
    if not db.query(models.Produto).filter(models.Produto.nome == p["nome"]).first():
        db.add(models.Produto(**p))
db.commit()
print("Mock products added!")
