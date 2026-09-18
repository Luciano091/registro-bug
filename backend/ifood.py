from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import database
import models
import schemas
import crud

router = APIRouter(
    prefix="/ifood",
    tags=["iFood Integration"]
)

@router.post("/simulate-order", response_model=schemas.Pedido)
def simulate_ifood_order(db: Session = Depends(database.get_db)):
    """
    Endpoint para simular o recebimento de um pedido (Webhook) da API do iFood.
    """
    estabelecimento = db.query(models.Estabelecimento).first()
    if not estabelecimento:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado.")
        
    produto = db.query(models.Produto).filter(models.Produto.estabelecimento_id == estabelecimento.id).first()
    if not produto:
        raise HTTPException(status_code=400, detail="Nenhum produto cadastrado para simular.")
        
    mock_ifood_order_id = "ifood-" + str(uuid.uuid4())[:13]
    
    pedido_create = schemas.PedidoCreate(
        cliente="Maria Silva (iFood)",
        telefone="11999999999",
        tipo_entrega="Delivery",
        forma_pagamento="Online",
        observacao="Simulação iFood - Não cobrar na entrega. Favor enviar sachês.",
        origem="ifood",
        ifood_order_id=mock_ifood_order_id,
        itens=[
            schemas.ItemPedidoCreate(
                produto_id=produto.id,
                quantidade=1,
                observacao="Sem cebola",
                opcoes=[]
            )
        ]
    )
    
    try:
        novo_pedido = crud.create_pedido(db, pedido_create, estabelecimento_id=estabelecimento.id)
        return novo_pedido
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
