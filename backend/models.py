from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class Produto(Base):
    __tablename__ = "produtos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    categoria = Column(String, index=True)
    preco = Column(Float)
    ativo = Column(Boolean, default=True)

class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, unique=True, index=True)
    cliente = Column(String, index=True)
    telefone = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    tipo_entrega = Column(String) # "Delivery" ou "Retirada"
    forma_pagamento = Column(String) # "Pix", "Cartão", "Dinheiro"
    status = Column(String, default="Recebido")
    subtotal = Column(Float, default=0.0)
    taxa_entrega = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    observacao = Column(String, nullable=True)
    data = Column(DateTime, default=datetime.datetime.utcnow)

    itens = relationship("ItemPedido", back_populates="pedido")

class ItemPedido(Base):
    __tablename__ = "itens_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"))
    produto_id = Column(Integer, ForeignKey("produtos.id"))
    quantidade = Column(Integer, default=1)
    valor_unitario = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)

    pedido = relationship("Pedido", back_populates="itens")
    produto = relationship("Produto")

class Configuracao(Base):
    __tablename__ = "configuracoes"

    id = Column(Integer, primary_key=True, index=True)
    nome_empresa = Column(String, default="Burger House")
    telefone = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    logo = Column(String, nullable=True)
    taxa_entrega = Column(Float, default=5.0)
    tempo_medio_preparo = Column(Integer, default=30)
