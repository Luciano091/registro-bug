from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import datetime

import models, schemas, crud
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Burger Hause API")

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
    caixa_aberto = crud.get_caixa_aberto(db)
    if not caixa_aberto:
        raise HTTPException(status_code=400, detail="Não é possível registrar pedido: o Caixa está fechado.")
        
    db_pedido = crud.create_pedido(db=db, pedido=pedido)
    
    # Adicionar movimentação automática
    mov = schemas.MovimentacaoCaixaCreate(
        tipo="venda",
        valor=db_pedido.total,
        forma_pagamento=db_pedido.forma_pagamento,
        descricao=f"Pedido #{db_pedido.numero}"
    )
    crud.add_movimentacao(db, caixa_aberto.id, mov)
    
    return db_pedido

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
def get_dashboard_relatorios(periodo: str = "mes", start: str = None, end: str = None, db: Session = Depends(get_db)):
    from datetime import timedelta
    import datetime
    hoje = datetime.datetime.utcnow().date()
    
    if periodo == "custom" and start and end:
        inicio_data = datetime.datetime.strptime(start, "%Y-%m-%d").date()
        fim_data = datetime.datetime.strptime(end, "%Y-%m-%d").date()
        inicio = datetime.datetime.combine(inicio_data, datetime.time.min)
        fim = datetime.datetime.combine(fim_data, datetime.time.max)
        delta = fim - inicio
        # Same duration prior period
        fim_ant = inicio - timedelta(seconds=1)
        inicio_ant = fim_ant - delta
    elif periodo == "hoje":
        inicio = datetime.datetime.combine(hoje, datetime.time.min)
        fim = datetime.datetime.combine(hoje, datetime.time.max)
        inicio_ant = inicio - timedelta(days=1)
        fim_ant = fim - timedelta(days=1)
    elif periodo == "7d":
        inicio = datetime.datetime.combine(hoje - timedelta(days=6), datetime.time.min)
        fim = datetime.datetime.combine(hoje, datetime.time.max)
        inicio_ant = inicio - timedelta(days=7)
        fim_ant = fim - timedelta(days=7)
    else: # mes
        inicio = datetime.datetime.combine(hoje.replace(day=1), datetime.time.min)
        fim = datetime.datetime.combine(hoje, datetime.time.max)
        if hoje.month == 1:
            inicio_ant = datetime.datetime.combine(hoje.replace(year=hoje.year-1, month=12, day=1), datetime.time.min)
        else:
            inicio_ant = datetime.datetime.combine(hoje.replace(month=hoje.month-1, day=1), datetime.time.min)
        import calendar
        _, last_day = calendar.monthrange(inicio_ant.year, inicio_ant.month)
        fim_ant = datetime.datetime.combine(inicio_ant.replace(day=last_day), datetime.time.max)
        
    pedidos_periodo = crud.get_pedidos_by_date_range(db, inicio, fim)
    pedidos_anteriores = crud.get_pedidos_by_date_range(db, inicio_ant, fim_ant)
    
    # Resumo atual
    faturamento_total = sum(p.total for p in pedidos_periodo)
    total_pedidos = len(pedidos_periodo)
    ticket_medio = faturamento_total / total_pedidos if total_pedidos > 0 else 0
    itens_vendidos = sum(sum(i.quantidade for i in p.itens) for p in pedidos_periodo)
    
    # Resumo anterior
    fat_ant = sum(p.total for p in pedidos_anteriores)
    ped_ant = len(pedidos_anteriores)
    tk_ant = fat_ant / ped_ant if ped_ant > 0 else 0
    it_ant = sum(sum(i.quantidade for i in p.itens) for p in pedidos_anteriores)
    
    def calc_growth(curr, ant):
        if ant == 0: return 100 if curr > 0 else 0
        return ((curr - ant) / ant) * 100

    # Pagamentos & Categorias
    pagamentos = {}
    categorias = {"Lanches": 0, "Bebidas": 0, "Acompanhamentos": 0, "Sobremesas": 0, "Outros": 0}
    
    for p in pedidos_periodo:
        if p.forma_pagamento not in pagamentos:
            pagamentos[p.forma_pagamento] = 0
        pagamentos[p.forma_pagamento] += p.total

        for item in p.itens:
            if item.produto:
                nome = (item.produto.nome or "").lower()
                cat = "Outros"
                if "burger" in nome or "lanche" in nome or "x-" in nome or "smash" in nome:
                    cat = "Lanches"
                elif "coca" in nome or "suco" in nome or "bebida" in nome or "água" in nome:
                    cat = "Bebidas"
                elif "frita" in nome or "batata" in nome or "nugget" in nome:
                    cat = "Acompanhamentos"
                elif "sorvete" in nome or "doce" in nome or "brownie" in nome:
                    cat = "Sobremesas"
                
                categorias[cat] += (item.quantidade * item.valor_unitario)
            
    vendas_pagamento = [{"name": k, "value": v} for k, v in pagamentos.items() if v > 0]
    vendas_categoria = [{"name": k, "value": v} for k, v in categorias.items() if v > 0]
    
    # Vendas no tempo (Gráfico de linha)
    vendas_tempo = {}
    if periodo == "hoje":
        for h in range(8, 24): vendas_tempo[f"{h:02d}:00"] = 0
        for p in pedidos_periodo:
            hora = f"{p.data.hour:02d}:00"
            if hora in vendas_tempo: vendas_tempo[hora] += p.total
        vendas_grafico = [{"name": k, "vendas": v} for k, v in vendas_tempo.items()]
    else:
        current_date = inicio.date()
        while current_date <= fim.date():
            vendas_tempo[current_date.strftime("%Y-%m-%d")] = {"name": f"{current_date.day:02d}/{current_date.month:02d}", "vendas": 0}
            current_date += timedelta(days=1)
        for p in pedidos_periodo:
            dia_str = p.data.date().strftime("%Y-%m-%d")
            if dia_str in vendas_tempo: vendas_tempo[dia_str]["vendas"] += p.total
        vendas_grafico = list(vendas_tempo.values())

    # Produtos mais vendidos (Top 5)
    vendas_produtos = {}
    for p in pedidos_periodo:
        for item in p.itens:
            if item.produto:
                nome_prod = item.produto.nome or "Produto Sem Nome"
                if nome_prod not in vendas_produtos:
                    vendas_produtos[nome_prod] = 0
                vendas_produtos[nome_prod] += item.quantidade
                
    produtos_ord = sorted([{"nome": k, "qtd": v} for k, v in vendas_produtos.items()], key=lambda x: x["qtd"], reverse=True)[:5]
    
    # Heatmap (Pedidos por Período)
    heatmap = {
        "Manhã (06h - 11h)": {"Seg":0, "Ter":0, "Qua":0, "Qui":0, "Sex":0, "Sáb":0, "Dom":0, "Total":0},
        "Tarde (12h - 17h)": {"Seg":0, "Ter":0, "Qua":0, "Qui":0, "Sex":0, "Sáb":0, "Dom":0, "Total":0},
        "Noite (18h - 23h)": {"Seg":0, "Ter":0, "Qua":0, "Qui":0, "Sex":0, "Sáb":0, "Dom":0, "Total":0},
        "Total": {"Seg":0, "Ter":0, "Qua":0, "Qui":0, "Sex":0, "Sáb":0, "Dom":0, "Total":0}
    }
    dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    for p in pedidos_periodo:
        dia = dias[p.data.weekday()]
        h = p.data.hour
        if 6 <= h <= 11: turno = "Manhã (06h - 11h)"
        elif 12 <= h <= 17: turno = "Tarde (12h - 17h)"
        else: turno = "Noite (18h - 23h)"
        
        heatmap[turno][dia] += 1
        heatmap[turno]["Total"] += 1
        heatmap["Total"][dia] += 1
        heatmap["Total"]["Total"] += 1
        
    heatmap_list = [{"turno": k, **v} for k, v in heatmap.items()]

    return {
        "resumo": {
            "faturamento": {"atual": faturamento_total, "crescimento": calc_growth(faturamento_total, fat_ant)},
            "pedidos": {"atual": total_pedidos, "crescimento": calc_growth(total_pedidos, ped_ant)},
            "ticket_medio": {"atual": ticket_medio, "crescimento": calc_growth(ticket_medio, tk_ant)},
            "itens_vendidos": {"atual": itens_vendidos, "crescimento": calc_growth(itens_vendidos, it_ant)}
        },
        "vendas_grafico": vendas_grafico,
        "vendas_categoria": vendas_categoria,
        "vendas_pagamento": vendas_pagamento,
        "produtos_top": produtos_ord,
        "heatmap": heatmap_list
    }

# --- Caixa ---
@app.get("/caixa/status", response_model=schemas.Caixa)
def get_caixa_status(db: Session = Depends(get_db)):
    caixa = crud.get_caixa_aberto(db)
    if not caixa:
        raise HTTPException(status_code=404, detail="Nenhum caixa aberto no momento.")
    return caixa

@app.post("/caixa/abrir", response_model=schemas.Caixa)
def abrir_caixa(caixa: schemas.CaixaCreate, db: Session = Depends(get_db)):
    caixa_aberto = crud.get_caixa_aberto(db)
    if caixa_aberto:
        raise HTTPException(status_code=400, detail="Já existe um caixa aberto.")
    return crud.abrir_caixa(db=db, caixa=caixa)

@app.post("/caixa/{caixa_id}/fechar", response_model=schemas.Caixa)
def fechar_caixa(caixa_id: int, db: Session = Depends(get_db)):
    caixa = crud.fechar_caixa(db=db, caixa_id=caixa_id)
    if not caixa:
        raise HTTPException(status_code=404, detail="Caixa não encontrado.")
    return caixa

@app.post("/caixa/{caixa_id}/movimento", response_model=schemas.MovimentacaoCaixa)
def add_movimento_caixa(caixa_id: int, movimento: schemas.MovimentacaoCaixaCreate, db: Session = Depends(get_db)):
    caixa = crud.get_caixa_aberto(db)
    if not caixa or caixa.id != caixa_id:
        raise HTTPException(status_code=400, detail="Caixa não está aberto ou ID inválido.")
    return crud.add_movimentacao(db=db, caixa_id=caixa_id, movimentacao=movimento)
