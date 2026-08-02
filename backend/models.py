from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime

def get_now():
    return datetime.datetime.utcnow() - datetime.timedelta(hours=3)

from database import Base

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
    data = Column(DateTime, default=get_now)

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
    nome_empresa = Column(String, default="Burger Hause")
    telefone = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    logo = Column(String, nullable=True)
    taxa_entrega = Column(Float, default=5.0)
    tempo_medio_preparo = Column(Integer, default=30)

class Caixa(Base):
    __tablename__ = "caixas"

    id = Column(Integer, primary_key=True, index=True)
    operador = Column(String)
    data_abertura = Column(DateTime, default=get_now)
    data_fechamento = Column(DateTime, nullable=True)
    saldo_inicial = Column(Float, default=0.0)
    saldo_final = Column(Float, nullable=True)
    status = Column(String, default="aberto") # "aberto" or "fechado"

    movimentacoes = relationship("MovimentacaoCaixa", back_populates="caixa")

class MovimentacaoCaixa(Base):
    __tablename__ = "movimentacoes_caixa"

    id = Column(Integer, primary_key=True, index=True)
    caixa_id = Column(Integer, ForeignKey("caixas.id"))
    tipo = Column(String) # "venda", "sangria", "suprimento"
    valor = Column(Float, default=0.0)
    forma_pagamento = Column(String)
    descricao = Column(String, nullable=True)
    data = Column(DateTime, default=get_now)

    caixa = relationship("Caixa", back_populates="movimentacoes")
