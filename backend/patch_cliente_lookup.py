import sys

with open('backend/crud.py', 'r') as f:
    content = f.read()

old_code = """
    if telefone_limpo:
        db_cliente = db.query(models.Cliente).filter(models.Cliente.telefone == telefone_limpo, models.Cliente.estabelecimento_id == estabelecimento_id).first()
        if not db_cliente:
            db_cliente = models.Cliente(
                estabelecimento_id=estabelecimento_id,
                nome=pedido.cliente,
                telefone=telefone_limpo,
                endereco=pedido.endereco
            )
            db.add(db_cliente)
            db.flush()
        else:
            if pedido.endereco and not db_cliente.endereco:
                db_cliente.endereco = pedido.endereco
            if pedido.cliente and not db_cliente.nome:
                db_cliente.nome = pedido.cliente
            db.flush()
        cliente_id = db_cliente.id"""

new_code = """
    if telefone_limpo:
        db_cliente = db.query(models.Cliente).filter(models.Cliente.telefone == telefone_limpo, models.Cliente.estabelecimento_id == estabelecimento_id).first()
        if not db_cliente and cliente_id:
            db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
            
        if not db_cliente:
            db_cliente = models.Cliente(
                estabelecimento_id=estabelecimento_id,
                nome=pedido.cliente,
                telefone=telefone_limpo,
                endereco=pedido.endereco
            )
            db.add(db_cliente)
            db.flush()
        else:
            if telefone_limpo and not db_cliente.telefone:
                db_cliente.telefone = telefone_limpo
            if pedido.endereco and not db_cliente.endereco:
                db_cliente.endereco = pedido.endereco
            if pedido.cliente and not db_cliente.nome:
                db_cliente.nome = pedido.cliente
            db.flush()
        cliente_id = db_cliente.id
    elif cliente_id:
        db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('backend/crud.py', 'w') as f:
        f.write(content)
        print("Success")
else:
    print("Not found")

