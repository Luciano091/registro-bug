import re

filepath = 'backend/models.py'
with open(filepath, 'r') as f:
    content = f.read()

cliente_model = """class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True)
    nome = Column(String)
    email = Column(String, unique=True, index=True)
    foto_url = Column(String, nullable=True)
    telefone = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    data_cadastro = Column(DateTime, default=get_now)
    
    pedidos = relationship("Pedido", back_populates="cliente_obj")

class Produto(Base):"""

content = content.replace("class Produto(Base):", cliente_model)

# Add cliente_id to Pedido
pedido_old = """    endereco = Column(String, nullable=True)
    tipo_entrega = Column(String) # "Delivery" ou "Retirada\""""
pedido_new = """    endereco = Column(String, nullable=True)
    tipo_entrega = Column(String) # "Delivery" ou "Retirada"
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)"""
content = content.replace(pedido_old, pedido_new)

# Add relationship to Pedido
rel_old = """    itens = relationship("ItemPedido", back_populates="pedido")"""
rel_new = """    itens = relationship("ItemPedido", back_populates="pedido")
    cliente_obj = relationship("Cliente", back_populates="pedidos")"""
content = content.replace(rel_old, rel_new)

with open(filepath, 'w') as f:
    f.write(content)
