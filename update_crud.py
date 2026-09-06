filepath = 'backend/crud.py'
with open(filepath, 'r') as f:
    content = f.read()

# Add get_cliente_by_google_id, get_cliente_by_id, create_cliente, update_cliente
cliente_crud = """
# --- Clientes ---

def get_cliente(db: Session, cliente_id: int):
    return db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()

def get_cliente_by_google_id(db: Session, google_id: str):
    return db.query(models.Cliente).filter(models.Cliente.google_id == google_id).first()

def get_cliente_by_email(db: Session, email: str):
    return db.query(models.Cliente).filter(models.Cliente.email == email).first()

def create_cliente(db: Session, cliente: schemas.ClienteCreate):
    db_cliente = models.Cliente(**cliente.dict())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

def update_cliente(db: Session, cliente_id: int, updates: schemas.ClienteUpdate):
    db_cliente = get_cliente(db, cliente_id)
    if db_cliente:
        if updates.telefone is not None:
            db_cliente.telefone = updates.telefone
        if updates.endereco is not None:
            db_cliente.endereco = updates.endereco
        db.commit()
        db.refresh(db_cliente)
    return db_cliente

# --- Pedidos ---
"""

content = content.replace("# --- Pedidos ---", cliente_crud)

# Update create_pedido to include cliente_id
content = content.replace("observacao=pedido.observacao,", "observacao=pedido.observacao,\n        cliente_id=pedido.cliente_id,")

with open(filepath, 'w') as f:
    f.write(content)
