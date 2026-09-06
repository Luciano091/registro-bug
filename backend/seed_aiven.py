import os
from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()
produtos = [
    {"nome": "X-Burger", "preco": 28.00, "categoria": "Hamburguer", "descricao": "Pão, carne e queijo"},
    {"nome": "X-Salada", "preco": 30.00, "categoria": "Hamburguer", "descricao": "Pão, carne, queijo, alface e tomate"},
    {"nome": "X-Bacon", "preco": 33.00, "categoria": "Hamburguer", "descricao": "Pão, carne, queijo e muito bacon"},
    {"nome": "Batata Frita", "preco": 15.00, "categoria": "Acompanhamento", "descricao": "Porção individual"},
    {"nome": "Refrigerante Lata", "preco": 7.00, "categoria": "Bebida", "descricao": "Coca, Guaraná, etc"}
]

for p in produtos:
    if not db.query(models.Produto).filter(models.Produto.nome == p["nome"]).first():
        db.add(models.Produto(**p))
db.commit()
print("Produtos inseridos com sucesso!")
