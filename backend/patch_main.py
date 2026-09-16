@app.post("/public/{slug}/mesas/{mesa_numero}/pedir")
def create_pedido_mesa(slug: str, mesa_numero: str, pedido: schemas.PedidoCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), cliente_id: Optional[str] = Depends(auth.get_current_cliente_optional)):
    estabelecimento = require_public_establishment(slug, db)
    caixa_aberto = crud.get_caixa_aberto(db, estabelecimento.id)
    if not caixa_aberto:
        raise HTTPException(status_code=400, detail="Não é possível registrar pedido: o Caixa está fechado.")
        
    try:
        comanda = crud.processar_pedido_mesa(db=db, mesa_numero=mesa_numero, estabelecimento_id=estabelecimento.id, pedido=pedido, cliente_id=cliente_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Notify KDS and Salon
    background_tasks.add_task(realtime.operation_hub.publish, estabelecimento.id, "pedido.criado", f"comanda-{comanda.id}")
    return {"message": "Pedido enviado para a cozinha com sucesso!", "comanda_id": comanda.id, "mesa": mesa_numero}

