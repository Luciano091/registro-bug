import sys

with open('backend/main.py', 'a') as f:
    f.write("""
@app.get("/admin/clientes/busca", response_model=schemas.Cliente)
def search_cliente(telefone: str, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("pedidos.criar"))):
    import re
    telefone_limpo = re.sub(r'\\D', '', telefone)
    cliente = db.query(models.Cliente).filter(models.Cliente.telefone == telefone_limpo, models.Cliente.estabelecimento_id == estabelecimento_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente

@app.get("/public/{slug}/clientes/me", response_model=schemas.Cliente)
def get_public_cliente(slug: str, db: Session = Depends(get_db), cliente_id: str = Depends(auth.get_current_cliente)):
    estabelecimento = require_public_establishment(slug, db)
    cliente = db.query(models.Cliente).filter(models.Cliente.id == int(cliente_id), models.Cliente.estabelecimento_id == estabelecimento.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente
""")
print("Added to the end of main.py")
