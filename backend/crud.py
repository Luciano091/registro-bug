from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas
import datetime

# --- Produtos ---
def get_produtos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Produto).offset(skip).limit(limit).all()

def create_produto(db: Session, produto: schemas.ProdutoCreate):
    db_produto = models.Produto(**produto.model_dump())
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    return db_produto

def update_produto(db: Session, produto_id: int, produto: schemas.ProdutoCreate):
    db_produto = db.query(models.Produto).filter(models.Produto.id == produto_id).first()
    if db_produto:
        for key, value in produto.model_dump().items():
            setattr(db_produto, key, value)
        db.commit()
        db.refresh(db_produto)
    return db_produto

# --- Pedidos ---
def get_pedidos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Pedido).order_by(models.Pedido.id.desc()).offset(skip).limit(limit).all()

def get_pedido(db: Session, pedido_id: int):
    return db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()

def get_pedidos_by_date_range(db: Session, start_date: datetime.datetime, end_date: datetime.datetime):
    return db.query(models.Pedido).filter(models.Pedido.data >= start_date, models.Pedido.data <= end_date).all()

def create_pedido(db: Session, pedido: schemas.PedidoCreate):
    # Calcular totais
    subtotal = 0.0
    db_itens = []
    
    for item in pedido.itens:
        produto = db.query(models.Produto).filter(models.Produto.id == item.produto_id).first()
        if produto:
            item_subtotal = produto.preco * item.quantidade
            subtotal += item_subtotal
            db_itens.append(
                models.ItemPedido(
                    produto_id=item.produto_id,
                    quantidade=item.quantidade,
                    valor_unitario=produto.preco,
                    subtotal=item_subtotal
                )
            )
            
    # Obter configuracao para taxa de entrega
    config = db.query(models.Configuracao).first()
    taxa_entrega = config.taxa_entrega if config and pedido.tipo_entrega == "Delivery" else 0.0
    
    total = subtotal + taxa_entrega
    
    # Gerar numero do pedido baseado na data e id (simplificado: YYYYMMDD-COUNT)
    hoje = datetime.datetime.utcnow().date()
    count_hoje = db.query(models.Pedido).filter(func.date(models.Pedido.data) == hoje).count() + 1
    numero_pedido = f"{hoje.strftime('%Y%m%d')}-{count_hoje:03d}"

    db_pedido = models.Pedido(
        numero=numero_pedido,
        cliente=pedido.cliente,
        telefone=pedido.telefone,
        endereco=pedido.endereco,
        tipo_entrega=pedido.tipo_entrega,
        forma_pagamento=pedido.forma_pagamento,
        observacao=pedido.observacao,
        subtotal=subtotal,
        taxa_entrega=taxa_entrega,
        total=total,
        status="Recebido"
    )
    
    db.add(db_pedido)
    db.commit()
    db.refresh(db_pedido)
    
    for db_item in db_itens:
        db_item.pedido_id = db_pedido.id
        db.add(db_item)
        
    db.commit()
    db.refresh(db_pedido)
    return db_pedido

def update_pedido_status(db: Session, pedido_id: int, status: str):
    db_pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if db_pedido:
        db_pedido.status = status
        db.commit()
        db.refresh(db_pedido)
    return db_pedido

# --- Configuracoes ---
def get_configuracao(db: Session):
    config = db.query(models.Configuracao).first()
    if not config:
        config = models.Configuracao()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

def update_configuracao(db: Session, config: schemas.ConfiguracaoCreate):
    db_config = db.query(models.Configuracao).first()
    if not db_config:
        db_config = models.Configuracao(**config.model_dump())
        db.add(db_config)
    else:
        for key, value in config.model_dump().items():
            setattr(db_config, key, value)
    db.commit()
    db.refresh(db_config)
    return db_config
