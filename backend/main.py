from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import datetime
from datetime import timedelta
import os
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, File, Form

import models, schemas, crud, whatsapp_api, auth
from database import engine, get_db, SessionLocal

models.Base.metadata.create_all(bind=engine)

# Auto-migrate uuid column for offline mode
try:
    with engine.begin() as conn:
        from sqlalchemy import text
        conn.execute(text("ALTER TABLE pedidos ADD COLUMN uuid VARCHAR;"))
except Exception:
    pass

# Auto-migrate columns for lucro liquido
try:
    with engine.begin() as conn:
        from sqlalchemy import text
        conn.execute(text("ALTER TABLE produtos ADD COLUMN preco_compra FLOAT DEFAULT 0.0;"))
        conn.execute(text("ALTER TABLE itens_pedido ADD COLUMN custo_unitario FLOAT DEFAULT 0.0;"))
except Exception:
    pass

# Auto-migrate columns for estoque
try:
    with engine.begin() as conn:
        from sqlalchemy import text
        conn.execute(text("ALTER TABLE produtos ADD COLUMN controlar_estoque BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE produtos ADD COLUMN estoque INTEGER DEFAULT 0;"))
except Exception:
    pass

# Auto-migrate columns for descricao and imagem_url
try:
    with engine.begin() as conn:
        from sqlalchemy import text
        conn.execute(text("ALTER TABLE produtos ADD COLUMN descricao VARCHAR;"))
        conn.execute(text("ALTER TABLE produtos ADD COLUMN imagem_url VARCHAR;"))
except Exception:
    pass

# Auto-migrate column for senha_admin
try:
    with engine.begin() as conn:
        from sqlalchemy import text
        conn.execute(text("ALTER TABLE configuracoes ADD COLUMN senha_admin VARCHAR DEFAULT 'burger123';"))
except Exception:
    pass

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

app = FastAPI(title="Burger Hause API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, can change to Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
def upload_image(
    file: UploadFile = File(...), 
    admin: bool = Depends(auth.get_current_admin)
):
    if not os.getenv("CLOUDINARY_CLOUD_NAME"):
        raise HTTPException(status_code=500, detail="Cloudinary não configurado nas variáveis de ambiente do Render")
    try:
        contents = file.file.read()
        
        result = cloudinary.uploader.upload(contents)
        return {"url": result.get("secure_url")}
    except Exception as e:
        print(f"Erro no Cloudinary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Cloudinary error: {str(e)}")

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

@app.delete("/produtos/{produto_id}", response_model=schemas.Produto)
def delete_produto(produto_id: int, db: Session = Depends(get_db)):
    db_produto = crud.delete_produto(db, produto_id)
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
        
    try:
        db_pedido = crud.create_pedido(db=db, pedido=pedido)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Adicionar movimentação automática
    mov = schemas.MovimentacaoCaixaCreate(
        tipo="venda",
        valor=db_pedido.total,
        forma_pagamento=db_pedido.forma_pagamento,
        descricao=f"Pedido #{db_pedido.numero}"
    )
    crud.add_movimentacao(db, caixa_aberto.id, mov)
    
    return db_pedido

async def send_status_whatsapp(telefone: str, message: str):
    db = SessionLocal()
    try:
        await whatsapp_api.send_whatsapp_message(telefone, message, db)
    finally:
        db.close()

@app.put("/pedidos/{pedido_id}/status", response_model=schemas.Pedido)
def update_pedido_status(pedido_id: int, status: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_pedido = crud.update_pedido_status(db, pedido_id=pedido_id, status=status)
    if db_pedido is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
    if db_pedido.telefone:
        formattedTotal = f"R$ {db_pedido.total:.2f}".replace(".", ",")
        statusText = f"acabou de ser atualizado para o status: *{db_pedido.status}*."
        if db_pedido.status == 'Recebido': statusText = "foi *Recebido* com sucesso e logo começaremos a prepará-lo!"
        elif db_pedido.status == 'Em preparo': statusText = "já está *Em Preparo* na nossa cozinha!"
        elif db_pedido.status == 'Pronto': statusText = "está *Pronto* e já pode ser retirado no balcão!" if db_pedido.tipo_entrega == 'Retirada' else "está *Pronto* e aguardando o entregador!"
        elif db_pedido.status == 'Saiu entrega': statusText = "acabou de *Sair para Entrega* e já está a caminho!"
        elif db_pedido.status == 'Finalizado': statusText = "foi *Finalizado*. Esperamos que tenha gostado!"
        
        message = f"Olá {db_pedido.cliente}!\n\nSeu pedido #{db_pedido.numero.split('-')[1] if '-' in db_pedido.numero else db_pedido.numero} no valor de *{formattedTotal}* {statusText}\n\nAgradecemos a preferência!"
        background_tasks.add_task(send_status_whatsapp, db_pedido.telefone, message)

    return db_pedido

# --- Autenticação ---
@app.post("/auth/login")
def login(login_req: schemas.LoginRequest, db: Session = Depends(get_db)):
    config = crud.get_configuracao(db)
    
    is_valid = False
    needs_rehash = False

    if config.senha_admin:
        # Tenta verificar se já é um hash do bcrypt
        try:
            if auth.verify_password(login_req.senha, config.senha_admin):
                is_valid = True
        except Exception:
            # Se der erro (ex: salt inválido, UnknownHashError), tenta checar se é a senha em texto plano
            pass

        # Se não validou como hash, checa se bate com texto puro (legado)
        if not is_valid and config.senha_admin == login_req.senha:
            is_valid = True
            needs_rehash = True
    else:
        # Se não tem senha configurada, o fallback é burger123
        if login_req.senha == "burger123":
            is_valid = True
            needs_rehash = True

    if is_valid:
        # Se a senha estava em texto plano ou não existia, atualiza no banco com o hash
        if needs_rehash:
            config.senha_admin = auth.get_password_hash(login_req.senha)
            db.commit()
            
        access_token = auth.create_access_token(
            data={"role": "admin"},
            expires_delta=timedelta(days=7)
        )
        return {"token": access_token}

    raise HTTPException(status_code=401, detail="Senha incorreta")

# --- Configuracoes ---
@app.get("/configuracao", response_model=schemas.Configuracao)
def read_configuracao(db: Session = Depends(get_db)):
    config = crud.get_configuracao(db)
    caixa_aberto = crud.get_caixa_aberto(db)
    
    config_dict = {c.name: getattr(config, c.name) for c in config.__table__.columns}
    config_dict["loja_aberta"] = caixa_aberto is not None
    return config_dict

@app.put("/configuracao", response_model=schemas.Configuracao)
def update_configuracao(config: schemas.ConfiguracaoCreate, db: Session = Depends(get_db)):
    return crud.update_configuracao(db=db, config=config)

# --- Dashboard & Relatorios ---
@app.get("/dashboard/resumo")
def get_dashboard_resumo(db: Session = Depends(get_db), admin: bool = Depends(auth.get_current_admin)):
    hoje = (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date()
    inicio_dia = datetime.datetime.combine(hoje, datetime.time.min)
    fim_dia = datetime.datetime.combine(hoje, datetime.time.max)
    
    pedidos_hoje = crud.get_pedidos_by_date_range(db, inicio_dia, fim_dia)
    
    total_pedidos = len(pedidos_hoje)
    faturamento_hoje = sum(p.total for p in pedidos_hoje)
    
    custo_hoje = sum(
        sum(item.quantidade * (item.custo_unitario or 0.0) for item in p.itens) 
        for p in pedidos_hoje
    )
    lucro_hoje = faturamento_hoje - custo_hoje

    ticket_medio = faturamento_hoje / total_pedidos if total_pedidos > 0 else 0
    
    # Produto mais vendido
    vendas_produtos = {}
    for pedido in pedidos_hoje:
        for item in pedido.itens:
            if item.produto:
                vendas_produtos[item.produto.nome] = vendas_produtos.get(item.produto.nome, 0) + item.quantidade
                
    mais_vendido = max(vendas_produtos.items(), key=lambda x: x[1]) if vendas_produtos else ("Nenhum", 0)
    ultimos_pedidos = crud.get_pedidos(db, limit=5)
    
    # Alertas de Estoque
    produtos_estoque = db.query(models.Produto).filter(
        models.Produto.controlar_estoque == True,
        models.Produto.estoque <= 3,
        models.Produto.ativo == True
    ).all()
    alertas_estoque = [{"id": p.id, "nome": p.nome, "estoque": p.estoque} for p in produtos_estoque]
    
    return {
        "pedidos_hoje": total_pedidos,
        "faturamento_hoje": faturamento_hoje,
        "lucro_hoje": lucro_hoje,
        "ticket_medio": ticket_medio,
        "mais_vendido": {"nome": mais_vendido[0], "quantidade": mais_vendido[1]},
        "ultimos_pedidos": ultimos_pedidos,
        "alertas_estoque": alertas_estoque
    }

@app.get("/dashboard/relatorios")
def get_dashboard_relatorios(periodo: str = "mes", start: str = None, end: str = None, db: Session = Depends(get_db)):
    from datetime import timedelta
    import datetime
    hoje = (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date()
    
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
        fim_ant = datetime.datetime.combine(inicio_ant.date().replace(day=last_day), datetime.time.max)

        
    pedidos_periodo = crud.get_pedidos_by_date_range(db, inicio, fim)
    pedidos_anteriores = crud.get_pedidos_by_date_range(db, inicio_ant, fim_ant)
    
    # Resumo atual
    faturamento_total = sum(p.total for p in pedidos_periodo)
    custo_total = sum(sum(i.quantidade * (i.custo_unitario or 0.0) for i in p.itens) for p in pedidos_periodo)
    lucro_total = faturamento_total - custo_total
    total_pedidos = len(pedidos_periodo)
    ticket_medio = faturamento_total / total_pedidos if total_pedidos > 0 else 0
    itens_vendidos = sum(sum(i.quantidade for i in p.itens) for p in pedidos_periodo)
    
    # Resumo anterior
    fat_ant = sum(p.total for p in pedidos_anteriores)
    custo_ant = sum(sum(i.quantidade * (i.custo_unitario or 0.0) for i in p.itens) for p in pedidos_anteriores)
    lucro_ant = fat_ant - custo_ant
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
        for h in range(8, 24): vendas_tempo[f"{h:02d}:00"] = {"vendas": 0, "lucro": 0}
        for p in pedidos_periodo:
            if not p.data: continue
            hora = f"{p.data.hour:02d}:00"
            if hora in vendas_tempo:
                vendas_tempo[hora]["vendas"] += p.total
                custo = sum(i.quantidade * (i.custo_unitario or 0.0) for i in p.itens)
                vendas_tempo[hora]["lucro"] += (p.total - custo)
        vendas_grafico = [{"name": k, "vendas": v["vendas"], "lucro": v["lucro"]} for k, v in vendas_tempo.items()]
    else:
        current_date = inicio.date()
        while current_date <= fim.date():
            vendas_tempo[current_date.strftime("%Y-%m-%d")] = {"name": f"{current_date.day:02d}/{current_date.month:02d}", "vendas": 0, "lucro": 0}
            current_date += timedelta(days=1)
        for p in pedidos_periodo:
            if not p.data: continue
            dia_str = p.data.date().strftime("%Y-%m-%d")
            if dia_str in vendas_tempo:
                vendas_tempo[dia_str]["vendas"] += p.total
                custo = sum(i.quantidade * (i.custo_unitario or 0.0) for i in p.itens)
                vendas_tempo[dia_str]["lucro"] += (p.total - custo)
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
        if not p.data: continue
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

    pedidos_raw = [
        {
            "id": p.id,
            "cliente": p.cliente or "Não informado",
            "data": p.data.strftime("%Y-%m-%d %H:%M:%S") if p.data else "",
            "total": float(p.total),
            "forma_pagamento": p.forma_pagamento or "Não informada",
            "status": p.status,
            "tipo_entrega": p.tipo_entrega
        }
        for p in pedidos_periodo
    ]

    return {
        "resumo": {
            "faturamento": {"atual": faturamento_total, "crescimento": calc_growth(faturamento_total, fat_ant)},
            "lucro": {"atual": lucro_total, "crescimento": calc_growth(lucro_total, lucro_ant)},
            "pedidos": {"atual": total_pedidos, "crescimento": calc_growth(total_pedidos, ped_ant)},
            "ticket_medio": {"atual": ticket_medio, "crescimento": calc_growth(ticket_medio, tk_ant)},
            "itens_vendidos": {"atual": itens_vendidos, "crescimento": calc_growth(itens_vendidos, it_ant)}
        },
        "vendas_grafico": vendas_grafico,
        "vendas_categoria": vendas_categoria,
        "vendas_pagamento": vendas_pagamento,
        "produtos_top": produtos_ord,
        "heatmap": heatmap_list,
        "pedidos_raw": pedidos_raw
    }

@app.get("/debug/relatorios")
def debug_relatorios(db: Session = Depends(get_db), admin: bool = Depends(auth.get_current_admin)):
    import traceback
    try:
        return get_dashboard_relatorios(periodo="mes", start=None, end=None, db=db)
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}

# --- Caixa ---
@app.get("/caixa/status", response_model=schemas.Caixa)
def get_caixa_status(db: Session = Depends(get_db), admin: bool = Depends(auth.get_current_admin)):
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
# --- WhatsApp Webhooks ---
@app.get("/webhook")
def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge")
):
    if hub_mode == "subscribe" and hub_verify_token == whatsapp_api.META_VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification token mismatch")

@app.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    # Process webhook in background to immediately return 200 to Meta
    
    async def run_webhook(payload):
        db = SessionLocal()
        try:
            await whatsapp_api.process_webhook(payload, db)
        finally:
            db.close()
            
    background_tasks.add_task(run_webhook, payload)
    return {"status": "ok"}

@app.get("/whatsapp/chats", response_model=List[schemas.WhatsAppContato])
def get_whatsapp_chats(db: Session = Depends(get_db), admin: bool = Depends(auth.get_current_admin)):
    # Returns contacts with their latest messages, ordered by recent interaction
    contatos = db.query(models.WhatsAppContato).order_by(models.WhatsAppContato.ultima_interacao.desc()).all()
    return contatos

@app.post("/whatsapp/send")
async def send_manual_message(telefone: str, texto: str, background_tasks: BackgroundTasks):
    async def send_msg_task():
        db = SessionLocal()
        try:
            await whatsapp_api.send_whatsapp_message(telefone, texto, db)
        finally:
            db.close()
            
    background_tasks.add_task(send_msg_task)
    return {"status": "queued"}
