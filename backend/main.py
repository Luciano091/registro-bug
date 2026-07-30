from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import datetime

import models, schemas, crud
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Burger House API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, can change to Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Produtos ---
@app.get("/produtos", response_model=List[schemas.Produto])
def read_produtos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_produtos(db, skip=skip, limit=limit)

@app.post("/produtos", response_model=schemas.Produto)
def create_produto(produto: schemas.ProdutoCreate, db: Session = Depends(get_db)):
    return crud.create_produto(db=db, produto=produto)

@app.put("/produtos/{produto_id}", response_model=schemas.Produto)
def update_produto(produto_id: int, produto: schemas.ProdutoCreate, db: Session = Depends(get_db)):
    db_produto = crud.update_produto(db, produto_id, produto)
    if db_produto is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return db_produto

# --- Pedidos ---
@app.get("/pedidos", response_model=List[schemas.Pedido])
def read_pedidos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_pedidos(db, skip=skip, limit=limit)

@app.get("/pedidos/{pedido_id}", response_model=schemas.Pedido)
def read_pedido(pedido_id: int, db: Session = Depends(get_db)):
    db_pedido = crud.get_pedido(db, pedido_id=pedido_id)
    if db_pedido is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return db_pedido

@app.post("/pedidos", response_model=schemas.Pedido)
def create_pedido(pedido: schemas.PedidoCreate, db: Session = Depends(get_db)):
    return crud.create_pedido(db=db, pedido=pedido)

@app.put("/pedidos/{pedido_id}/status", response_model=schemas.Pedido)
def update_pedido_status(pedido_id: int, status: str, db: Session = Depends(get_db)):
    db_pedido = crud.update_pedido_status(db, pedido_id=pedido_id, status=status)
    if db_pedido is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return db_pedido

# --- Configuracoes ---
@app.get("/configuracao", response_model=schemas.Configuracao)
def read_configuracao(db: Session = Depends(get_db)):
    return crud.get_configuracao(db)

@app.put("/configuracao", response_model=schemas.Configuracao)
def update_configuracao(config: schemas.ConfiguracaoCreate, db: Session = Depends(get_db)):
    return crud.update_configuracao(db=db, config=config)

# --- Dashboard & Relatorios ---
@app.get("/dashboard/resumo")
def get_dashboard_resumo(db: Session = Depends(get_db)):
    hoje = datetime.datetime.utcnow().date()
    inicio_dia = datetime.datetime.combine(hoje, datetime.time.min)
    fim_dia = datetime.datetime.combine(hoje, datetime.time.max)
    
    pedidos_hoje = crud.get_pedidos_by_date_range(db, inicio_dia, fim_dia)
    
    total_pedidos = len(pedidos_hoje)
    faturamento_hoje = sum(p.total for p in pedidos_hoje)
    ticket_medio = faturamento_hoje / total_pedidos if total_pedidos > 0 else 0
    
    # Produto mais vendido
    vendas_produtos = {}
    for pedido in pedidos_hoje:
        for item in pedido.itens:
            if item.produto:
                vendas_produtos[item.produto.nome] = vendas_produtos.get(item.produto.nome, 0) + item.quantidade
                
    mais_vendido = max(vendas_produtos.items(), key=lambda x: x[1]) if vendas_produtos else ("Nenhum", 0)
    ultimos_pedidos = crud.get_pedidos(db, limit=5)
    
    return {
        "pedidos_hoje": total_pedidos,
        "faturamento_hoje": faturamento_hoje,
        "ticket_medio": ticket_medio,
        "mais_vendido": {"nome": mais_vendido[0], "quantidade": mais_vendido[1]},
        "ultimos_pedidos": ultimos_pedidos
    }

@app.get("/dashboard/relatorios")
def get_dashboard_relatorios(db: Session = Depends(get_db)):
    hoje = datetime.datetime.utcnow().date()
    inicio_mes = hoje.replace(day=1)
    
    # Real data for today
    inicio_dia = datetime.datetime.combine(hoje, datetime.time.min)
    fim_dia = datetime.datetime.combine(hoje, datetime.time.max)
    pedidos_hoje = crud.get_pedidos_by_date_range(db, inicio_dia, fim_dia)
    
    pagamentos = {"Pix": 0, "Cartão": 0, "Dinheiro": 0}
    for p in pedidos_hoje:
        if p.forma_pagamento in pagamentos:
            pagamentos[p.forma_pagamento] += p.total
            
    vendas_pagamento = [
        {"name": "Pix", "value": pagamentos["Pix"]},
        {"name": "Cartão", "value": pagamentos["Cartão"]},
        {"name": "Dinheiro", "value": pagamentos["Dinheiro"]},
    ]
    
    # Calculate last 7 days including today
    dias_semana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    inicio_semana = hoje - datetime.timedelta(days=6)
    pedidos_semana = crud.get_pedidos_by_date_range(db, datetime.datetime.combine(inicio_semana, datetime.time.min), datetime.datetime.combine(hoje, datetime.time.max))
    
    vendas_semana_dict = {dias_semana[(hoje - datetime.timedelta(days=i)).weekday()]: 0 for i in range(6, -1, -1)}
    
    for p in pedidos_semana:
        nome_dia = dias_semana[p.data.weekday()]
        if nome_dia in vendas_semana_dict:
            vendas_semana_dict[nome_dia] += p.total
            
    vendas_semana = []
    for i in range(6, -1, -1):
        d = hoje - datetime.timedelta(days=i)
        nome_dia = dias_semana[d.weekday()]
        vendas_semana.append({"name": nome_dia, "vendas": vendas_semana_dict[nome_dia]})
    
    # Monthly stats
    pedidos_mes = db.query(models.Pedido).filter(models.Pedido.data >= datetime.datetime.combine(inicio_mes, datetime.time.min)).all()
    
    faturamento_mes = sum(p.total for p in pedidos_mes)
    total_mes = len(pedidos_mes)
    
    vendas_produtos = {}
    for p in pedidos_mes:
        for item in p.itens:
            if item.produto:
                vendas_produtos[item.produto.nome] = vendas_produtos.get(item.produto.nome, 0) + item.quantidade
                
    produtos_ord = sorted([{"nome": k, "qtd": v} for k, v in vendas_produtos.items()], key=lambda x: x["qtd"], reverse=True)[:5]
    max_qtd = produtos_ord[0]["qtd"] if produtos_ord else 1
    produtos_mes = [{"nome": p["nome"], "qtd": p["qtd"], "pct": int((p["qtd"] / max_qtd) * 100)} for p in produtos_ord]
    
    return {
        "resumo_diario": {
            "pedidos": len(pedidos_hoje),
            "faturamento": sum(p.total for p in pedidos_hoje),
            "vendas_pagamento": vendas_pagamento
        },
        "vendas_semana": vendas_semana,
        "produtos_mes": produtos_mes,
        "metricas_mes": {
            "total_pedidos": total_mes,
            "faturamento": faturamento_mes,
            "ticket_medio": faturamento_mes / total_mes if total_mes > 0 else 0
        }
    }
