from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import backend.models as models
import backend.schemas as schemas
from backend.crud import create_pedido

engine = create_engine("sqlite:///banco.db")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

produto = db.query(models.Produto).filter(models.Produto.nome == "X-SALADA").first()
print(f"Produto: {produto.nome}, preco: {produto.preco}, is_promocao: {produto.is_promocao}, preco_promocao: {produto.preco_promocao}")

pedido = schemas.PedidoCreate(
    cliente="Teste",
    telefone="1234567890",
    tipo_entrega="Retirada",
    forma_pagamento="Dinheiro",
    itens=[schemas.ItemPedidoCreate(produto_id=produto.id, quantidade=1)]
)

import uuid
pedido.uuid = str(uuid.uuid4())

try:
    db_pedido = create_pedido(db, pedido)
    print(f"Pedido Total: {db_pedido.total}")
except Exception as e:
    print(e)
