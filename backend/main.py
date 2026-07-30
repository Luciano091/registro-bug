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
def get_dashboard_relatorios(periodo: str = "mes", db: Session = Depends(get_db)):
    from datetime import timedelta
    hoje = datetime.datetime.utcnow().date()
    
    if periodo == "hoje":
        inicio = datetime.datetime.combine(hoje, datetime.time.min)
        fim = datetime.datetime.combine(hoje, datetime.time.max)
    elif periodo == "7d":
        inicio = datetime.datetime.combine(hoje - timedelta(days=6), datetime.time.min)
        fim = datetime.datetime.combine(hoje, datetime.time.max)
    else: # mes
        inicio = datetime.datetime.combine(hoje.replace(day=1), datetime.time.min)
        fim = datetime.datetime.combine(hoje, datetime.time.max)
        
    pedidos_periodo = crud.get_pedidos_by_date_range(db, inicio, fim)
    
    # Resumo do periodo
    faturamento_total = sum(p.total for p in pedidos_periodo)
    total_pedidos = len(pedidos_periodo)
    ticket_medio = faturamento_total / total_pedidos if total_pedidos > 0 else 0
    
    # Pagamentos
    pagamentos = {"Pix": 0, "Cartão": 0, "Dinheiro": 0}
    for p in pedidos_periodo:
        if p.forma_pagamento in pagamentos:
            pagamentos[p.forma_pagamento] += p.total
            
    vendas_pagamento = [
        {"name": "Pix", "value": pagamentos["Pix"]},
        {"name": "Cartão", "value": pagamentos["Cartão"]},
        {"name": "Dinheiro", "value": pagamentos["Dinheiro"]},
    ]
    
    # Vendas no tempo (Gráfico de linha)
    vendas_tempo = {}
    if periodo == "hoje":
        # Agrupar por hora
        for h in range(8, 24):
            vendas_tempo[f"{h:02d}:00"] = 0
        for p in pedidos_periodo:
            hora = f"{p.data.hour:02d}:00"
            if hora in vendas_tempo:
                vendas_tempo[hora] += p.total
        vendas_grafico = [{"name": k, "vendas": v} for k, v in vendas_tempo.items()]
    else:
        # Agrupar por dia
        dias_semana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
        current_date = inicio.date()
        while current_date <= fim.date():
            if periodo == "mes":
                nome_dia = f"{current_date.day:02d}/{current_date.month:02d}"
            else:
                nome_dia = dias_semana[current_date.weekday()]
            vendas_tempo[current_date.strftime("%Y-%m-%d")] = {"name": nome_dia, "vendas": 0}
            current_date += timedelta(days=1)
            
        for p in pedidos_periodo:
            dia_str = p.data.date().strftime("%Y-%m-%d")
            if dia_str in vendas_tempo:
                vendas_tempo[dia_str]["vendas"] += p.total
                
        vendas_grafico = list(vendas_tempo.values())

    # Produtos mais vendidos (Top 10)
    vendas_produtos = {}
    for p in pedidos_periodo:
        for item in p.itens:
            if item.produto:
                if item.produto.nome not in vendas_produtos:
                    vendas_produtos[item.produto.nome] = {"qtd": 0, "receita": 0}
                vendas_produtos[item.produto.nome]["qtd"] += item.quantidade
                vendas_produtos[item.produto.nome]["receita"] += (item.quantidade * item.preco_unitario)
                
    produtos_ord = sorted([{"nome": k, "qtd": v["qtd"], "receita": v["receita"]} for k, v in vendas_produtos.items()], key=lambda x: x["receita"], reverse=True)[:10]
    
    max_receita = produtos_ord[0]["receita"] if produtos_ord else 1
    produtos_top = [{"nome": p["nome"], "qtd": p["qtd"], "receita": p["receita"], "pct": int((p["receita"] / max_receita) * 100)} for p in produtos_ord]
    
    return {
        "resumo": {
            "pedidos": total_pedidos,
            "faturamento": faturamento_total,
            "ticket_medio": ticket_medio,
            "vendas_pagamento": vendas_pagamento
        },
        "vendas_grafico": vendas_grafico,
        "produtos_top": produtos_top
    }

