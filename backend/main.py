from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import datetime
from datetime import timedelta
import os
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, File, Form

import models, schemas, crud, whatsapp_api, auth
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from database import engine, get_db, SessionLocal

models.Base.metadata.create_all(bind=engine)

# Migração incremental para transformar a base existente em multiestabelecimento.
from sqlalchemy import inspect, text
for table_name in ("clientes", "produtos", "pedidos", "configuracoes", "caixas", "whatsapp_contatos", "insumos"):
    existing_columns = {column["name"] for column in inspect(engine).get_columns(table_name)}
    if "estabelecimento_id" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN estabelecimento_id INTEGER"))

config_columns = {column["name"] for column in inspect(engine).get_columns("configuracoes")}
if "whatsapp_phone_number_id" not in config_columns:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE configuracoes ADD COLUMN whatsapp_phone_number_id VARCHAR"))
if engine.dialect.name == "postgresql":
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE whatsapp_contatos DROP CONSTRAINT IF EXISTS whatsapp_contatos_telefone_key"))

with SessionLocal() as migration_db:
    crud.ensure_initial_establishment(migration_db)

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

app = FastAPI(title="Ritmesa API")

cors_env = os.getenv("CORS_ORIGINS", "")
cors_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()] or [
    "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
    "https://ritmesa.com.br", "https://www.ritmesa.com.br",
    "https://painel.ritmesa.com.br", "https://admin.ritmesa.com.br",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://[a-z0-9-]+\.ritmesa\.com\.br",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
def upload_image(
    file: UploadFile = File(...), 
    admin: int = Depends(auth.require_permission("cardapio.gerenciar"))
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
def require_public_establishment(slug: str, db: Session):
    estabelecimento = crud.get_estabelecimento_by_slug(db, slug)
    if not estabelecimento:
        raise HTTPException(status_code=404, detail="Estabelecimento indisponível.")
    return estabelecimento

@app.get("/public/{slug}/produtos", response_model=List[schemas.Produto])
def public_products(slug: str, skip: int = 0, limit: int = 500, canal: str = None, db: Session = Depends(get_db)):
    estabelecimento = require_public_establishment(slug, db)
    return crud.get_produtos(db, estabelecimento.id, skip=skip, limit=limit, somente_ativos=True, canal=canal)

@app.get("/public/{slug}/categorias", response_model=List[schemas.Categoria])
def public_categories(slug: str, db: Session = Depends(get_db)):
    estabelecimento = require_public_establishment(slug, db)
    return crud.get_categorias(db, estabelecimento.id, somente_disponiveis=True)

@app.post("/public/{slug}/cupons/validar", response_model=schemas.CupomValidado)
def public_validate_coupon(slug: str, payload: schemas.CupomValidar, db: Session = Depends(get_db)):
    estabelecimento = require_public_establishment(slug, db)
    try:
        cupom, desconto = crud.validar_cupom(db, payload.codigo, payload.subtotal, estabelecimento.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return schemas.CupomValidado(codigo=cupom.codigo, desconto=desconto, total=max(0, payload.subtotal - desconto), descricao=cupom.descricao)

@app.get("/produtos", response_model=List[schemas.Produto])
def read_produtos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("cardapio.visualizar"))):
    return crud.get_produtos(db, estabelecimento_id, skip=skip, limit=limit)

@app.post("/produtos", response_model=schemas.Produto)
def create_produto(produto: schemas.ProdutoCreate, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("cardapio.gerenciar"))):
    try:
        return crud.create_produto(db=db, produto=produto, estabelecimento_id=estabelecimento_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@app.put("/produtos/{produto_id}", response_model=schemas.Produto)
def update_produto(produto_id: int, produto: schemas.ProdutoCreate, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("cardapio.gerenciar"))):
    try:
        db_produto = crud.update_produto(db, produto_id, produto, estabelecimento_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if db_produto is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return db_produto

@app.get("/categorias", response_model=List[schemas.Categoria])
def list_categories(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("cardapio.visualizar"))):
    return crud.get_categorias(db, estabelecimento_id)

@app.post("/categorias", response_model=schemas.Categoria, status_code=201)
def create_category(payload: schemas.CategoriaCreate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cardapio.gerenciar"))):
    try:
        categoria = crud.save_categoria(db, payload, usuario.estabelecimento_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    crud.create_audit_log(db, usuario.estabelecimento_id, "categoria.criada", usuario.usuario_id, "categoria", categoria.id)
    return categoria

@app.put("/categorias/{categoria_id}", response_model=schemas.Categoria)
def update_category(categoria_id: int, payload: schemas.CategoriaCreate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cardapio.gerenciar"))):
    try:
        categoria = crud.save_categoria(db, payload, usuario.estabelecimento_id, categoria_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    crud.create_audit_log(db, usuario.estabelecimento_id, "categoria.atualizada", usuario.usuario_id, "categoria", categoria.id)
    return categoria

@app.delete("/categorias/{categoria_id}", response_model=schemas.Categoria)
def delete_category(categoria_id: int, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cardapio.gerenciar"))):
    categoria = crud.delete_categoria(db, categoria_id, usuario.estabelecimento_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    crud.create_audit_log(db, usuario.estabelecimento_id, "categoria.desativada", usuario.usuario_id, "categoria", categoria.id)
    return categoria

@app.get("/cupons", response_model=List[schemas.Cupom])
def list_coupons(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("cardapio.visualizar"))):
    return crud.get_cupons(db, estabelecimento_id)

@app.post("/cupons", response_model=schemas.Cupom, status_code=201)
def create_coupon(payload: schemas.CupomCreate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cardapio.gerenciar"))):
    try:
        cupom = crud.save_cupom(db, payload, usuario.estabelecimento_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    crud.create_audit_log(db, usuario.estabelecimento_id, "cupom.criado", usuario.usuario_id, "cupom", cupom.id)
    return cupom

@app.put("/cupons/{cupom_id}", response_model=schemas.Cupom)
def update_coupon(cupom_id: int, payload: schemas.CupomCreate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cardapio.gerenciar"))):
    try:
        cupom = crud.save_cupom(db, payload, usuario.estabelecimento_id, cupom_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not cupom:
        raise HTTPException(status_code=404, detail="Cupom não encontrado.")
    crud.create_audit_log(db, usuario.estabelecimento_id, "cupom.atualizado", usuario.usuario_id, "cupom", cupom.id)
    return cupom

@app.delete("/produtos/{produto_id}", response_model=schemas.Produto)
def delete_produto(produto_id: int, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("cardapio.gerenciar"))):
    db_produto = crud.delete_produto(db, produto_id, estabelecimento_id)
    if db_produto is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return db_produto

@app.get("/grupos-opcoes", response_model=List[schemas.GrupoOpcao])
def list_option_groups(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("cardapio.visualizar"))):
    return crud.get_grupos_opcoes(db, estabelecimento_id)

@app.post("/grupos-opcoes", response_model=schemas.GrupoOpcao, status_code=201)
def create_option_group(payload: schemas.GrupoOpcaoCreate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cardapio.gerenciar"))):
    try:
        grupo = crud.save_grupo_opcao(db, payload, usuario.estabelecimento_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    crud.create_audit_log(db, usuario.estabelecimento_id, "grupo_opcao.criado", usuario.usuario_id, "grupo_opcao", grupo.id)
    return grupo

@app.put("/grupos-opcoes/{grupo_id}", response_model=schemas.GrupoOpcao)
def update_option_group(grupo_id: int, payload: schemas.GrupoOpcaoCreate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cardapio.gerenciar"))):
    try:
        grupo = crud.save_grupo_opcao(db, payload, usuario.estabelecimento_id, grupo_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo não encontrado.")
    crud.create_audit_log(db, usuario.estabelecimento_id, "grupo_opcao.atualizado", usuario.usuario_id, "grupo_opcao", grupo.id)
    return grupo

@app.delete("/grupos-opcoes/{grupo_id}")
def delete_option_group(grupo_id: int, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cardapio.gerenciar"))):
    if not crud.delete_grupo_opcao(db, grupo_id, usuario.estabelecimento_id):
        raise HTTPException(status_code=404, detail="Grupo não encontrado.")
    crud.create_audit_log(db, usuario.estabelecimento_id, "grupo_opcao.excluido", usuario.usuario_id, "grupo_opcao", grupo_id)
    return {"status": "ok"}

@app.put("/produtos/{produto_id}/grupos-opcoes", response_model=schemas.Produto)
def update_product_option_groups(produto_id: int, payload: schemas.ProdutoGruposUpdate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cardapio.gerenciar"))):
    try:
        produto = crud.set_produto_grupos(db, produto_id, payload.grupo_ids, usuario.estabelecimento_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    crud.create_audit_log(db, usuario.estabelecimento_id, "produto.grupos_atualizados", usuario.usuario_id, "produto", produto_id, {"grupos": payload.grupo_ids})
    return produto

# --- Pedidos ---
@app.get("/pedidos", response_model=List[schemas.Pedido])
def read_pedidos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("pedidos.visualizar"))):
    return crud.get_pedidos(db, estabelecimento_id, skip=skip, limit=limit)

@app.get("/pedidos/{pedido_id}", response_model=schemas.Pedido)
def read_pedido(pedido_id: int, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("pedidos.visualizar"))):
    db_pedido = crud.get_pedido(db, pedido_id=pedido_id, estabelecimento_id=estabelecimento_id)
    if db_pedido is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return db_pedido



@app.post("/auth/google")
def auth_google(token_data: dict, db: Session = Depends(get_db)):
    # token_data must contain 'token' (the credential string from Google)
    token = token_data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token não fornecido")
    
    CLIENT_ID = "190788590463-vmt6leseuk1o1g8knrsi6f6he801ga1l.apps.googleusercontent.com"
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)
        
        google_id = idinfo['sub']
        email = idinfo['email']
        nome = idinfo.get('name', email)
        foto = idinfo.get('picture')
        
        cliente = crud.get_cliente_by_google_id(db, google_id)
        if not cliente:
            cliente = crud.get_cliente_by_email(db, email)
            if cliente:
                # Update existing user to link google_id
                cliente.google_id = google_id
                db.commit()
                db.refresh(cliente)
            else:
                # Create new
                novo_cliente = schemas.ClienteCreate(
                    google_id=google_id,
                    nome=nome,
                    email=email,
                    foto_url=foto
                )
                cliente = crud.create_cliente(db, novo_cliente)
                
        # Generate JWT for cliente
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": str(cliente.id), "role": "cliente"}, expires_delta=access_token_expires
        )
        
        return {
            "token": access_token,
            "cliente": {
                "id": cliente.id,
                "nome": cliente.nome,
                "email": cliente.email,
                "foto_url": cliente.foto_url,
                "telefone": cliente.telefone,
                "endereco": cliente.endereco
            }
        }
    except Exception as e:
        import traceback
        err_str = traceback.format_exc()
        # Save error globally to read it later
        global last_google_auth_error
        last_google_auth_error = err_str
        print("GOOGLE AUTH ERROR:", err_str)
        raise HTTPException(status_code=500, detail=str(e))

last_google_auth_error = "Nenhum erro ainda"

@app.get("/auth/google/debug")
def debug_google_auth(_: dict = Depends(auth.get_current_platform_admin)):
    return {"error": last_google_auth_error}

# --- Administração da plataforma Ritmesa ---
@app.post("/platform/auth/login")
def platform_login(login_req: schemas.PlatformLoginRequest):
    if not auth.authenticate_platform_admin(login_req.email, login_req.senha):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    token = auth.create_access_token(
        data={"sub": login_req.email.strip().lower(), "role": "platform_admin"},
        expires_delta=timedelta(hours=12),
    )
    return {"token": token, "admin": {"email": login_req.email.strip().lower(), "nome": "Administração Ritmesa"}}

@app.get("/platform/resumo")
def platform_summary(db: Session = Depends(get_db), _: dict = Depends(auth.get_current_platform_admin)):
    estabelecimentos = crud.get_estabelecimentos(db)
    leads = crud.get_leads(db)
    return {
        "estabelecimentos": len(estabelecimentos),
        "ativos": sum(1 for item in estabelecimentos if item.status == "ativo"),
        "em_teste": sum(1 for item in estabelecimentos if item.status == "trial"),
        "bloqueados": sum(1 for item in estabelecimentos if item.status in ("bloqueado", "cancelado")),
        "leads_novos": sum(1 for lead in leads if lead.status == "novo"),
        "pedidos_processados": db.query(models.Pedido).count(),
    }

@app.get("/platform/estabelecimentos", response_model=List[schemas.Estabelecimento])
def platform_establishments(db: Session = Depends(get_db), _: dict = Depends(auth.get_current_platform_admin)):
    return crud.get_estabelecimentos(db)

@app.post("/platform/estabelecimentos", response_model=schemas.Estabelecimento)
def platform_create_establishment(payload: schemas.EstabelecimentoCreate, db: Session = Depends(get_db), _: dict = Depends(auth.get_current_platform_admin)):
    import re
    payload.slug = re.sub(r"[^a-z0-9-]", "", payload.slug.strip().lower().replace(" ", "-"))
    if not payload.slug:
        raise HTTPException(status_code=400, detail="Informe um endereço válido para o cardápio.")
    try:
        return crud.create_estabelecimento(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

@app.put("/platform/estabelecimentos/{estabelecimento_id}", response_model=schemas.Estabelecimento)
def platform_update_establishment(estabelecimento_id: int, payload: schemas.EstabelecimentoUpdate, db: Session = Depends(get_db), _: dict = Depends(auth.get_current_platform_admin)):
    if payload.slug is not None:
        import re
        payload.slug = re.sub(r"[^a-z0-9-]", "", payload.slug.strip().lower().replace(" ", "-"))
    try:
        item = crud.update_estabelecimento(db, estabelecimento_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    if not item:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado.")
    return item

@app.post("/comercial/interesse", response_model=schemas.LeadComercial)
def public_commercial_lead(payload: schemas.LeadComercialCreate, db: Session = Depends(get_db)):
    return crud.create_lead(db, payload)

@app.get("/platform/leads", response_model=List[schemas.LeadComercial])
def platform_leads(db: Session = Depends(get_db), _: dict = Depends(auth.get_current_platform_admin)):
    return crud.get_leads(db)

@app.put("/platform/leads/{lead_id}", response_model=schemas.LeadComercial)
def platform_update_lead(lead_id: int, payload: schemas.LeadComercialUpdate, db: Session = Depends(get_db), _: dict = Depends(auth.get_current_platform_admin)):
    lead = crud.update_lead(db, lead_id, payload)
    if not lead:
        raise HTTPException(status_code=404, detail="Contato não encontrado.")
    return lead

@app.post("/public/{slug}/pedidos", response_model=schemas.Pedido)
def create_pedido(slug: str, pedido: schemas.PedidoCreate, db: Session = Depends(get_db), cliente_id: Optional[str] = Depends(auth.get_current_cliente_optional)):
    estabelecimento = require_public_establishment(slug, db)
    if cliente_id:
        pedido.cliente_id = int(cliente_id)

    caixa_aberto = crud.get_caixa_aberto(db, estabelecimento.id)
    if not caixa_aberto:
        raise HTTPException(status_code=400, detail="Não é possível registrar pedido: o Caixa está fechado.")
        
    try:
        db_pedido = crud.create_pedido(db=db, pedido=pedido, estabelecimento_id=estabelecimento.id)
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

@app.post("/pedidos", response_model=schemas.Pedido)
def create_admin_order(pedido: schemas.PedidoAdminCreate, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("pedidos.criar"))):
    caixa_aberto = crud.get_caixa_aberto(db, estabelecimento_id)
    if not caixa_aberto:
        raise HTTPException(status_code=400, detail="Não é possível registrar pedido: o Caixa está fechado.")
    try:
        pedido_base = schemas.PedidoCreate(**pedido.model_dump(exclude={"taxa_entrega_manual"}))
        db_pedido = crud.create_pedido(db, pedido_base, estabelecimento_id, pedido.taxa_entrega_manual)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    movimento = schemas.MovimentacaoCaixaCreate(
        tipo="venda",
        valor=db_pedido.total,
        forma_pagamento=db_pedido.forma_pagamento,
        descricao=f"Pedido #{db_pedido.numero}",
    )
    crud.add_movimentacao(db, caixa_aberto.id, movimento)
    return db_pedido

# --- Painel de cozinha (KDS) ---
@app.get("/cozinha/setores", response_model=List[schemas.SetorProducao])
def list_kitchen_stations(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("cozinha.operar"))):
    return crud.get_setores_producao(db, estabelecimento_id)

@app.post("/cozinha/setores", response_model=schemas.SetorProducao, status_code=201)
def create_kitchen_station(payload: schemas.SetorProducaoCreate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cozinha.gerenciar"))):
    try: setor = crud.save_setor_producao(db, payload, usuario.estabelecimento_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    crud.create_audit_log(db, usuario.estabelecimento_id, "cozinha.setor_criado", usuario.usuario_id, "setor_producao", setor.id)
    return setor

@app.put("/cozinha/setores/{setor_id}", response_model=schemas.SetorProducao)
def update_kitchen_station(setor_id: int, payload: schemas.SetorProducaoCreate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cozinha.gerenciar"))):
    try: setor = crud.save_setor_producao(db, payload, usuario.estabelecimento_id, setor_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    if not setor: raise HTTPException(status_code=404, detail="Setor não encontrado.")
    return setor

@app.put("/cozinha/produtos/{produto_id}/setor", response_model=schemas.Produto)
def assign_product_station(produto_id: int, payload: schemas.ProdutoSetorUpdate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cozinha.gerenciar"))):
    try: produto = crud.set_produto_setor(db, produto_id, payload.setor_producao_id, usuario.estabelecimento_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    if not produto: raise HTTPException(status_code=404, detail="Produto não encontrado.")
    return produto

@app.get("/cozinha/fila", response_model=List[schemas.CozinhaTicket])
def kitchen_queue(setor_id: Optional[int] = None, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("cozinha.operar"))):
    if setor_id and not crud.get_setor_producao(db, setor_id, estabelecimento_id): raise HTTPException(status_code=404, detail="Setor não encontrado.")
    return crud.get_fila_cozinha(db, estabelecimento_id, setor_id)

@app.put("/cozinha/itens/{origem}/{item_id}/status")
def update_kitchen_item(origem: str, item_id: int, payload: schemas.CozinhaStatusUpdate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("cozinha.operar"))):
    try: item = crud.atualizar_item_cozinha(db, origem, item_id, payload.status, usuario.estabelecimento_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    if not item: raise HTTPException(status_code=404, detail="Item não encontrado.")
    return {"id": item.id, "status": item.status if origem == "comanda" else item.status_producao}

# --- Expedição e entregadores ---
@app.get("/entregas/painel", response_model=List[schemas.Pedido])
def delivery_board(db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("entregas.visualizar"))):
    entregador_id = usuario.usuario_id if usuario.perfil == "entregador" else None
    return crud.get_pedidos_entrega(db, usuario.estabelecimento_id, entregador_id)

@app.get("/entregas/entregadores", response_model=List[schemas.Usuario])
def delivery_drivers(db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("entregas.visualizar"))):
    return crud.get_entregadores(db, usuario.estabelecimento_id)

@app.post("/entregas/{pedido_id}/atribuir", response_model=schemas.Pedido)
def assign_delivery(pedido_id: int, payload: schemas.EntregaAtribuir, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("entregas.gerenciar"))):
    try: pedido = crud.atribuir_entrega(db, pedido_id, payload.entregador_id, usuario.estabelecimento_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    if not pedido: raise HTTPException(status_code=404, detail="Pedido de entrega não encontrado.")
    crud.create_audit_log(db, usuario.estabelecimento_id, "entrega.atribuida", usuario.usuario_id, "pedido", pedido.id, {"entregador_id": payload.entregador_id})
    return pedido

@app.put("/entregas/{pedido_id}/status", response_model=schemas.Pedido)
def update_delivery_status(pedido_id: int, payload: schemas.EntregaStatusUpdate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.get_current_user)):
    if not (usuario.pode("entregas.operar") or usuario.pode("entregas.gerenciar")): raise HTTPException(status_code=403, detail="Você não tem permissão para esta ação.")
    try:
        pedido = crud.atualizar_status_entrega(db, pedido_id, payload.status, usuario)
        if pedido and pedido.entrega: pedido.entrega.observacao = payload.observacao; db.commit(); db.refresh(pedido)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    if not pedido: raise HTTPException(status_code=404, detail="Entrega não encontrada.")
    crud.create_audit_log(db, usuario.estabelecimento_id, f"entrega.{payload.status}", usuario.usuario_id, "pedido", pedido.id)
    return pedido

@app.put("/entregas/{pedido_id}/localizacao", response_model=schemas.Pedido)
def update_delivery_location(pedido_id: int, payload: schemas.EntregaLocalizacao, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("entregas.operar"))):
    try: pedido = crud.atualizar_localizacao_entrega(db, pedido_id, payload.latitude, payload.longitude, usuario)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    if not pedido: raise HTTPException(status_code=404, detail="Entrega não encontrada.")
    return pedido

# --- Salão e comandas ---
@app.get("/salao/mesas", response_model=List[schemas.MesaVisao])
def list_tables(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("salao.operar"))):
    return [{"id": mesa.id, "numero": mesa.numero, "nome": mesa.nome, "capacidade": mesa.capacidade, "ativo": mesa.ativo, "ordem": mesa.ordem, "status": mesa.status, "comanda": crud.get_comanda_aberta_mesa(db, mesa.id, estabelecimento_id)} for mesa in crud.get_mesas(db, estabelecimento_id)]

@app.post("/salao/mesas", response_model=schemas.Mesa, status_code=201)
def create_table(payload: schemas.MesaCreate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("salao.gerenciar"))):
    try: mesa = crud.save_mesa(db, payload, usuario.estabelecimento_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    crud.create_audit_log(db, usuario.estabelecimento_id, "mesa.criada", usuario.usuario_id, "mesa", mesa.id)
    return mesa

@app.put("/salao/mesas/{mesa_id}", response_model=schemas.Mesa)
def update_table(mesa_id: int, payload: schemas.MesaCreate, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("salao.gerenciar"))):
    try: mesa = crud.save_mesa(db, payload, usuario.estabelecimento_id, mesa_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    if not mesa: raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    crud.create_audit_log(db, usuario.estabelecimento_id, "mesa.atualizada", usuario.usuario_id, "mesa", mesa.id)
    return mesa

@app.post("/salao/comandas", response_model=schemas.Comanda, status_code=201)
def open_tab(payload: schemas.ComandaAbrir, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("salao.operar"))):
    try: comanda = crud.abrir_comanda(db, payload, usuario)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    crud.create_audit_log(db, usuario.estabelecimento_id, "comanda.aberta", usuario.usuario_id, "comanda", comanda.id)
    return comanda

@app.get("/salao/comandas/{comanda_id}", response_model=schemas.Comanda)
def read_tab(comanda_id: int, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("salao.operar"))):
    comanda = crud.get_comanda(db, comanda_id, estabelecimento_id)
    if not comanda: raise HTTPException(status_code=404, detail="Comanda não encontrada.")
    return comanda

@app.post("/salao/comandas/{comanda_id}/itens", response_model=schemas.Comanda)
def add_tab_item(comanda_id: int, payload: schemas.ComandaItemAdicionar, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("salao.operar"))):
    try: return crud.adicionar_item_comanda(db, comanda_id, payload, usuario)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))

@app.put("/salao/itens/{item_id}/status", response_model=schemas.ComandaItem)
def update_tab_item_status(item_id: int, payload: schemas.ComandaItemStatus, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("salao.operar"))):
    try: item = crud.atualizar_status_item_comanda(db, item_id, payload.status, estabelecimento_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    if not item: raise HTTPException(status_code=404, detail="Item não encontrado.")
    return item

@app.delete("/salao/itens/{item_id}", response_model=schemas.Comanda)
def cancel_tab_item(item_id: int, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("salao.operar"))):
    comanda = crud.cancelar_item_comanda(db, item_id, estabelecimento_id)
    if not comanda: raise HTTPException(status_code=404, detail="Item não encontrado.")
    return comanda

@app.post("/salao/comandas/{comanda_id}/transferir", response_model=schemas.Comanda)
def transfer_tab(comanda_id: int, payload: schemas.ComandaTransferir, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("salao.operar"))):
    try: return crud.transferir_comanda(db, comanda_id, payload.mesa_destino_id, estabelecimento_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))

@app.post("/salao/comandas/{comanda_id}/unir", response_model=schemas.Comanda)
def merge_tabs(comanda_id: int, payload: schemas.ComandaUnir, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("salao.operar"))):
    try: return crud.unir_comandas(db, comanda_id, payload.comanda_origem_id, estabelecimento_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))

@app.post("/salao/comandas/{comanda_id}/fechar", response_model=schemas.Comanda)
def close_tab(comanda_id: int, payload: schemas.ComandaFechar, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("salao.operar"))):
    try: comanda = crud.fechar_comanda(db, comanda_id, payload, usuario.estabelecimento_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    crud.create_audit_log(db, usuario.estabelecimento_id, "comanda.fechada", usuario.usuario_id, "comanda", comanda.id)
    return comanda

@app.post("/salao/comandas/{comanda_id}/cancelar", response_model=schemas.Comanda)
def cancel_tab(comanda_id: int, db: Session = Depends(get_db), usuario: auth.UsuarioAutenticado = Depends(auth.require_user_permission("salao.operar"))):
    try: comanda = crud.cancelar_comanda(db, comanda_id, usuario.estabelecimento_id)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))
    crud.create_audit_log(db, usuario.estabelecimento_id, "comanda.cancelada", usuario.usuario_id, "comanda", comanda.id)
    return comanda

@app.get("/public/{slug}/acompanhamento/{codigo}", response_model=schemas.Pedido)
def public_order(slug: str, codigo: str, db: Session = Depends(get_db)):
    estabelecimento = require_public_establishment(slug, db)
    pedido = crud.get_pedido_by_public_token(db, codigo, estabelecimento.id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    return pedido

async def send_status_whatsapp(telefone: str, message: str, estabelecimento_id: int):
    db = SessionLocal()
    try:
        await whatsapp_api.send_whatsapp_message(telefone, message, db, estabelecimento_id)
    finally:
        db.close()

@app.put("/pedidos/{pedido_id}/status", response_model=schemas.Pedido)
def update_pedido_status(pedido_id: int, status: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("pedidos.atualizar"))):
    db_pedido = crud.update_pedido_status(db, pedido_id=pedido_id, status=status, estabelecimento_id=estabelecimento_id)
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
        
        numero_exibicao = db_pedido.numero.split('-')[-1]
        message = f"Olá {db_pedido.cliente}!\n\nSeu pedido #{numero_exibicao} no valor de *{formattedTotal}* {statusText}\n\nAgradecemos a preferência!"
        background_tasks.add_task(send_status_whatsapp, db_pedido.telefone, message, estabelecimento_id)

    return db_pedido

# --- Autenticação ---
@app.post("/auth/login")
def login(login_req: schemas.LoginRequest, db: Session = Depends(get_db)):
    estabelecimento = crud.get_estabelecimento_by_slug(db, login_req.estabelecimento)
    if not estabelecimento:
        raise HTTPException(status_code=404, detail="Estabelecimento indisponível.")
    config = crud.get_configuracao(db, estabelecimento.id)

    if login_req.email:
        usuario = crud.get_usuario_by_email(db, login_req.email, estabelecimento.id)
        if not usuario or not usuario.ativo or not auth.verify_password(login_req.senha, usuario.senha_hash):
            raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
        usuario.ultimo_acesso_em = models.get_now()
        db.commit()
        access_token = auth.create_access_token(
            data={
                "role": "staff", "usuario_id": usuario.id,
                "estabelecimento_id": estabelecimento.id, "estabelecimento": estabelecimento.slug,
            },
            expires_delta=timedelta(days=7),
        )
        contexto = auth.UsuarioAutenticado(
            estabelecimento_id=estabelecimento.id, usuario_id=usuario.id, nome=usuario.nome,
            email=usuario.email, perfil=usuario.perfil,
            permissoes=frozenset(auth.PERMISSOES_POR_PERFIL.get(usuario.perfil, set())),
        )
        crud.create_audit_log(db, estabelecimento.id, "auth.login", usuario.id, "usuario", usuario.id)
        return {
            "token": access_token,
            "estabelecimento": {"id": estabelecimento.id, "nome": estabelecimento.nome, "slug": estabelecimento.slug},
            "usuario": auth.serialize_user(contexto),
        }
    
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
            
        usuario = crud.ensure_owner_user(db, estabelecimento, login_req.senha)
        usuario.ultimo_acesso_em = models.get_now()
        db.commit()
        access_token = auth.create_access_token(
            data={"role": "staff", "usuario_id": usuario.id, "estabelecimento_id": estabelecimento.id, "estabelecimento": estabelecimento.slug},
            expires_delta=timedelta(days=7)
        )
        contexto = auth.UsuarioAutenticado(
            estabelecimento_id=estabelecimento.id, usuario_id=usuario.id, nome=usuario.nome,
            email=usuario.email, perfil=usuario.perfil, permissoes=frozenset({"*"}),
        )
        crud.create_audit_log(db, estabelecimento.id, "auth.login_legado", usuario.id, "usuario", usuario.id)
        return {
            "token": access_token,
            "estabelecimento": {"id": estabelecimento.id, "nome": estabelecimento.nome, "slug": estabelecimento.slug},
            "usuario": auth.serialize_user(contexto),
        }

    raise HTTPException(status_code=401, detail="Senha incorreta")

@app.get("/auth/me", response_model=schemas.SessaoUsuario)
def auth_me(usuario: auth.UsuarioAutenticado = Depends(auth.get_current_user)):
    return auth.serialize_user(usuario)

# --- Equipe e permissões ---
@app.get("/usuarios/perfis")
def list_profiles(_: auth.UsuarioAutenticado = Depends(auth.require_user_permission("usuarios.visualizar"))):
    return [
        {"id": perfil, "nome": perfil.replace("_", " ").title(), "permissoes": sorted(permissoes)}
        for perfil, permissoes in auth.PERMISSOES_POR_PERFIL.items()
    ]

@app.get("/usuarios", response_model=List[schemas.Usuario])
def list_users(
    db: Session = Depends(get_db),
    atual: auth.UsuarioAutenticado = Depends(auth.require_user_permission("usuarios.visualizar")),
):
    return crud.get_usuarios(db, atual.estabelecimento_id)

@app.post("/usuarios", response_model=schemas.Usuario, status_code=201)
def create_user(
    payload: schemas.UsuarioCreate,
    db: Session = Depends(get_db),
    atual: auth.UsuarioAutenticado = Depends(auth.require_user_permission("usuarios.gerenciar")),
):
    if payload.perfil == "proprietario" and atual.perfil != "proprietario":
        raise HTTPException(status_code=403, detail="Somente o proprietário pode cadastrar outro proprietário.")
    try:
        usuario = crud.create_usuario(db, payload, atual.estabelecimento_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    crud.create_audit_log(db, atual.estabelecimento_id, "usuario.criado", atual.usuario_id, "usuario", usuario.id, {"perfil": usuario.perfil})
    return usuario

@app.put("/usuarios/{usuario_id}", response_model=schemas.Usuario)
def update_user(
    usuario_id: int,
    payload: schemas.UsuarioUpdate,
    db: Session = Depends(get_db),
    atual: auth.UsuarioAutenticado = Depends(auth.require_user_permission("usuarios.gerenciar")),
):
    alvo = crud.get_usuario(db, usuario_id, atual.estabelecimento_id)
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    novo_perfil = payload.perfil or alvo.perfil
    if (alvo.perfil == "proprietario" or novo_perfil == "proprietario") and atual.perfil != "proprietario":
        raise HTTPException(status_code=403, detail="Somente o proprietário pode alterar esse perfil.")
    if usuario_id == atual.usuario_id and payload.ativo is False:
        raise HTTPException(status_code=400, detail="Você não pode desativar o próprio acesso.")
    if alvo.perfil == "proprietario" and (payload.ativo is False or novo_perfil != "proprietario"):
        proprietarios = [item for item in crud.get_usuarios(db, atual.estabelecimento_id) if item.perfil == "proprietario" and item.ativo]
        if len(proprietarios) <= 1:
            raise HTTPException(status_code=400, detail="O estabelecimento precisa manter ao menos um proprietário ativo.")
    try:
        usuario = crud.update_usuario(db, usuario_id, payload, atual.estabelecimento_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    crud.create_audit_log(db, atual.estabelecimento_id, "usuario.atualizado", atual.usuario_id, "usuario", usuario.id, payload.model_dump(exclude_unset=True, exclude={"senha"}))
    return usuario

# --- Configuracoes ---
@app.get("/public/{slug}/entrega/configuracao", response_model=schemas.EntregaConfiguracao)
def public_delivery_config(slug: str, db: Session = Depends(get_db)):
    estabelecimento = require_public_establishment(slug, db)
    config = crud.get_configuracao_entrega(db, estabelecimento.id)
    config["areas"] = [area for area in config["areas"] if area.ativo]
    return config

@app.post("/public/{slug}/entrega/cotar", response_model=schemas.EntregaCotacao)
def public_delivery_quote(slug: str, payload: schemas.EntregaCotacaoRequest, db: Session = Depends(get_db)):
    estabelecimento = require_public_establishment(slug, db)
    return crud.calcular_entrega(db, estabelecimento.id, payload.subtotal, payload.bairro, payload.latitude, payload.longitude)

@app.get("/configuracao/entrega", response_model=schemas.EntregaConfiguracao)
def read_delivery_config(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("configuracoes.visualizar"))):
    return crud.get_configuracao_entrega(db, estabelecimento_id)

@app.put("/configuracao/entrega", response_model=schemas.EntregaConfiguracao)
def update_delivery_config(payload: schemas.EntregaConfiguracaoUpdate, db: Session = Depends(get_db), atual: auth.UsuarioAutenticado = Depends(auth.require_user_permission("configuracoes.gerenciar"))):
    try:
        result = crud.save_configuracao_entrega(db, payload, atual.estabelecimento_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    crud.create_audit_log(db, atual.estabelecimento_id, "entrega.configuracao_atualizada", atual.usuario_id, "configuracao")
    return result

@app.post("/configuracao/entrega/cotar", response_model=schemas.EntregaCotacao)
def admin_delivery_quote(payload: schemas.EntregaCotacaoRequest, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("pedidos.criar"))):
    return crud.calcular_entrega(db, estabelecimento_id, payload.subtotal, payload.bairro, payload.latitude, payload.longitude)

@app.get("/public/{slug}/configuracao", response_model=schemas.ConfiguracaoPublica)
def public_configuracao(slug: str, db: Session = Depends(get_db)):
    estabelecimento = require_public_establishment(slug, db)
    config = crud.get_configuracao(db, estabelecimento.id)
    caixa_aberto = crud.get_caixa_aberto(db, estabelecimento.id)
    config_dict = {c.name: getattr(config, c.name) for c in config.__table__.columns}
    config_dict["loja_aberta"] = caixa_aberto is not None
    return config_dict

@app.get("/configuracao", response_model=schemas.Configuracao)
def read_configuracao(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("configuracoes.visualizar"))):
    config = crud.get_configuracao(db, estabelecimento_id)
    caixa_aberto = crud.get_caixa_aberto(db, estabelecimento_id)
    
    config_dict = {c.name: getattr(config, c.name) for c in config.__table__.columns}
    config_dict["loja_aberta"] = caixa_aberto is not None
    return config_dict

@app.put("/configuracao", response_model=schemas.Configuracao)
def update_configuracao(
    config: schemas.ConfiguracaoCreate,
    db: Session = Depends(get_db),
    atual: auth.UsuarioAutenticado = Depends(auth.require_user_permission("configuracoes.gerenciar")),
):
    if config.senha_admin and atual.perfil != "proprietario":
        raise HTTPException(status_code=403, detail="Somente o proprietário pode alterar a senha principal.")
    return crud.update_configuracao(db=db, config=config, estabelecimento_id=atual.estabelecimento_id)

# --- Dashboard & Relatorios ---
@app.get("/dashboard/resumo")
def get_dashboard_resumo(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("dashboard.visualizar"))):
    hoje = (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date()
    inicio_dia = datetime.datetime.combine(hoje, datetime.time.min)
    fim_dia = datetime.datetime.combine(hoje, datetime.time.max)
    
    pedidos_hoje = crud.get_pedidos_by_date_range(db, inicio_dia, fim_dia, estabelecimento_id)
    
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
    ultimos_pedidos = crud.get_pedidos(db, estabelecimento_id, limit=5)
    
    # Alertas de Estoque
    produtos_estoque = db.query(models.Produto).filter(
        models.Produto.estabelecimento_id == estabelecimento_id,
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
def get_dashboard_relatorios(periodo: str = "mes", start: str = None, end: str = None, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("relatorios.visualizar"))):
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

        
    pedidos_periodo = crud.get_pedidos_by_date_range(db, inicio, fim, estabelecimento_id)
    pedidos_anteriores = crud.get_pedidos_by_date_range(db, inicio_ant, fim_ant, estabelecimento_id)
    
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
def debug_relatorios(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("relatorios.visualizar"))):
    import traceback
    try:
        return get_dashboard_relatorios(periodo="mes", start=None, end=None, db=db, estabelecimento_id=estabelecimento_id)
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}

# --- Caixa ---
@app.get("/caixa/status", response_model=schemas.Caixa)
def get_caixa_status(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("caixa.visualizar"))):
    caixa = crud.get_caixa_aberto(db, estabelecimento_id)
    if not caixa:
        raise HTTPException(status_code=404, detail="Nenhum caixa aberto no momento.")
    return caixa

@app.post("/caixa/abrir", response_model=schemas.Caixa)
def abrir_caixa(caixa: schemas.CaixaCreate, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("caixa.operar"))):
    caixa_aberto = crud.get_caixa_aberto(db, estabelecimento_id)
    if caixa_aberto:
        raise HTTPException(status_code=400, detail="Já existe um caixa aberto.")
    return crud.abrir_caixa(db=db, caixa=caixa, estabelecimento_id=estabelecimento_id)

@app.post("/caixa/{caixa_id}/fechar", response_model=schemas.Caixa)
def fechar_caixa(caixa_id: int, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("caixa.operar"))):
    caixa = crud.fechar_caixa(db=db, caixa_id=caixa_id, estabelecimento_id=estabelecimento_id)
    if not caixa:
        raise HTTPException(status_code=404, detail="Caixa não encontrado.")
    return caixa

@app.post("/caixa/{caixa_id}/movimento", response_model=schemas.MovimentacaoCaixa)
def add_movimento_caixa(caixa_id: int, movimento: schemas.MovimentacaoCaixaCreate, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("caixa.operar"))):
    caixa = crud.get_caixa_aberto(db, estabelecimento_id)
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
def get_whatsapp_chats(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("whatsapp.visualizar"))):
    # Returns contacts with their latest messages, ordered by recent interaction
    contatos = db.query(models.WhatsAppContato).filter(models.WhatsAppContato.estabelecimento_id == estabelecimento_id).order_by(models.WhatsAppContato.ultima_interacao.desc()).all()
    return contatos

@app.post("/whatsapp/send")
async def send_manual_message(telefone: str, texto: str, background_tasks: BackgroundTasks, estabelecimento_id: int = Depends(auth.require_permission("whatsapp.enviar"))):
    async def send_msg_task():
        db = SessionLocal()
        try:
            await whatsapp_api.send_whatsapp_message(telefone, texto, db, estabelecimento_id)
        finally:
            db.close()
            
    background_tasks.add_task(send_msg_task)
    return {"status": "queued"}

# --- Insumos ---
@app.get("/insumos", response_model=List[schemas.Insumo])
def get_insumos(db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("estoque.visualizar"))):
    return crud.get_insumos(db, estabelecimento_id)

@app.post("/insumos", response_model=schemas.Insumo)
def create_insumo(insumo: schemas.InsumoCreate, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("estoque.gerenciar"))):
    return crud.create_insumo(db=db, insumo=insumo, estabelecimento_id=estabelecimento_id)

@app.put("/insumos/{insumo_id}", response_model=schemas.Insumo)
def update_insumo(insumo_id: int, insumo: schemas.InsumoCreate, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("estoque.gerenciar"))):
    db_insumo = crud.update_insumo(db, insumo_id, insumo, estabelecimento_id)
    if not db_insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    return db_insumo

@app.delete("/insumos/{insumo_id}")
def delete_insumo(insumo_id: int, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("estoque.gerenciar"))):
    db_insumo = crud.delete_insumo(db, insumo_id, estabelecimento_id)
    if not db_insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    return {"status": "ok"}

# --- Ficha Tecnica ---
@app.get("/produtos/{produto_id}/ficha-tecnica", response_model=List[schemas.ProdutoInsumo])
def get_ficha_tecnica(produto_id: int, db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("estoque.visualizar"))):
    return crud.get_ficha_tecnica(db, produto_id, estabelecimento_id)

@app.put("/produtos/{produto_id}/ficha-tecnica", response_model=List[schemas.ProdutoInsumo])
def update_ficha_tecnica(produto_id: int, itens: List[schemas.ProdutoInsumoCreate], db: Session = Depends(get_db), estabelecimento_id: int = Depends(auth.require_permission("estoque.gerenciar"))):
    return crud.update_ficha_tecnica(db, produto_id, itens, estabelecimento_id)
