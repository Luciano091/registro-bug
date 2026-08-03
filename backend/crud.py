from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas
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
    if pedido.uuid:
        existing = db.query(models.Pedido).filter(models.Pedido.uuid == pedido.uuid).first()
        if existing:
            return existing

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
                    custo_unitario=produto.preco_compra or 0.0,
                    valor_unitario=produto.preco,
                    subtotal=item_subtotal
                )
            )
            if produto.controlar_estoque:
                produto.estoque -= item.quantidade
            
    taxa_entrega = 0.0
    
    total = subtotal + taxa_entrega
    
    # Gerar numero do pedido baseado na data e id (simplificado: YYYYMMDD-COUNT)
    hoje = (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date()
    count_hoje = db.query(models.Pedido).filter(func.date(models.Pedido.data) == hoje).count() + 1
    numero_pedido = f"{hoje.strftime('%Y%m%d')}-{count_hoje:03d}"

    db_pedido = models.Pedido(
        uuid=pedido.uuid,
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

# --- Caixa ---
def get_caixa_aberto(db: Session):
    return db.query(models.Caixa).filter(models.Caixa.status == "aberto").first()

def abrir_caixa(db: Session, caixa: schemas.CaixaCreate):
    db_caixa = models.Caixa(**caixa.model_dump())
    db.add(db_caixa)
    db.commit()
    db.refresh(db_caixa)
    return db_caixa

def fechar_caixa(db: Session, caixa_id: int):
    db_caixa = db.query(models.Caixa).filter(models.Caixa.id == caixa_id).first()
    if db_caixa:
        db_caixa.status = "fechado"
        db_caixa.data_fechamento = datetime.datetime.utcnow() - datetime.timedelta(hours=3)
        
        # Calcular saldo final
        total_entradas = sum(m.valor for m in db_caixa.movimentacoes if m.tipo in ["venda", "suprimento"])
        total_saidas = sum(m.valor for m in db_caixa.movimentacoes if m.tipo == "sangria")
        db_caixa.saldo_final = db_caixa.saldo_inicial + total_entradas - total_saidas
        
        db.commit()
        db.refresh(db_caixa)
    return db_caixa

def add_movimentacao(db: Session, caixa_id: int, movimentacao: schemas.MovimentacaoCaixaCreate):
    db_mov = models.MovimentacaoCaixa(**movimentacao.model_dump(), caixa_id=caixa_id)
    db.add(db_mov)
    db.commit()
    db.refresh(db_mov)
    return db_mov
