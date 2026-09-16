import re

with open('crud.py', 'r') as f:
    crud_content = f.read()

cancel_crud = """
def cancelar_pedido(db: Session, pedido_id: int, motivo: str, estornado: bool, estabelecimento_id: int):
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id, models.Pedido.estabelecimento_id == estabelecimento_id).first()
    if not pedido:
        return None
    pedido.status = 'Cancelado'
    pedido.motivo_cancelamento = motivo
    pedido.estornado = estornado
    db.commit()
    db.refresh(pedido)
    return pedido
"""
if "def cancelar_pedido" not in crud_content:
    crud_content += "\n" + cancel_crud
    with open('crud.py', 'w') as f:
        f.write(crud_content)

with open('schemas.py', 'r') as f:
    schemas_content = f.read()

cancel_schema = """
class PedidoCancelamento(BaseModel):
    motivo: str
    estornado: bool = False
"""
if "class PedidoCancelamento" not in schemas_content:
    schemas_content += "\n" + cancel_schema
    with open('schemas.py', 'w') as f:
        f.write(schemas_content)

with open('main.py', 'r') as f:
    main_content = f.read()

cancel_endpoint = """
@app.post("/pedidos/{pedido_id}/cancelar", response_model=schemas.Pedido)
def cancelar_pedido(pedido_id: int, payload: schemas.PedidoCancelamento, background_tasks: BackgroundTasks, db: Session = Depends(get_db), atual: auth.UsuarioAutenticado = Depends(auth.require_user_permission("pedidos.atualizar"))):
    pedido = crud.cancelar_pedido(db, pedido_id, payload.motivo, payload.estornado, atual.estabelecimento_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    # Audit log
    db.add(models.LogAuditoria(
        estabelecimento_id=atual.estabelecimento_id,
        acao="PEDIDO_CANCELADO",
        recurso="pedidos",
        recurso_id=pedido.id,
        detalhes=f"Motivo: {payload.motivo}. Estornado: {payload.estornado}",
        usuario_id=atual.usuario_id
    ))
    db.commit()
    return pedido
"""
if "def cancelar_pedido" not in main_content:
    # Use auth.UsuarioAutenticado import if needed. We assume it's imported.
    if "@app.delete(\"/pedidos/{pedido_id}\")" in main_content:
        main_content = main_content.replace("@app.delete(\"/pedidos/{pedido_id}\")", cancel_endpoint + "\n@app.delete(\"/pedidos/{pedido_id}\")")
    else:
        main_content += "\n" + cancel_endpoint
    with open('main.py', 'w') as f:
        f.write(main_content)
