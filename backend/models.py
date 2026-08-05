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
    descricao = Column(String, nullable=True)
    imagem_url = Column(String, nullable=True)
    preco_compra = Column(Float, default=0.0)
    preco = Column(Float)
    ativo = Column(Boolean, default=True)
    controlar_estoque = Column(Boolean, default=False)
    estoque = Column(Integer, default=0)

class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, unique=True, index=True, nullable=True)
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
    custo_unitario = Column(Float, default=0.0)
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
    whatsapp_auto_reply_enabled = Column(Boolean, default=False)
    whatsapp_auto_reply_text = Column(String, nullable=True)
    senha_admin = Column(String, default="burger123")

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

class WhatsAppContato(Base):
    __tablename__ = "whatsapp_contatos"

    id = Column(Integer, primary_key=True, index=True)
    telefone = Column(String, unique=True, index=True) # Ex: "5511999999999"
    nome = Column(String, nullable=True)
    ultima_interacao = Column(DateTime, default=get_now)
    
    mensagens = relationship("WhatsAppMensagem", back_populates="contato", order_by="WhatsAppMensagem.data")

class WhatsAppMensagem(Base):
    __tablename__ = "whatsapp_mensagens"

    id = Column(Integer, primary_key=True, index=True)
    contato_id = Column(Integer, ForeignKey("whatsapp_contatos.id"))
    direcao = Column(String) # "in" (recebida), "out" (enviada)
    texto = Column(String)
    status = Column(String, default="sent") # "sent", "delivered", "read", "received"
    data = Column(DateTime, default=get_now)
    meta_message_id = Column(String, nullable=True, unique=True) # ID da mensagem na Meta

    contato = relationship("WhatsAppContato", back_populates="mensagens")
