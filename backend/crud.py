from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas
import datetime
import uuid as uuid_lib

# --- Produtos ---
def get_produtos(db: Session, estabelecimento_id: int, skip: int = 0, limit: int = 100, somente_ativos: bool = False):
    query = db.query(models.Produto).filter(models.Produto.estabelecimento_id == estabelecimento_id)
    if somente_ativos:
        query = query.filter(models.Produto.ativo == True)
    return query.offset(skip).limit(limit).all()

def create_produto(db: Session, produto: schemas.ProdutoCreate, estabelecimento_id: int):
    db_produto = models.Produto(**produto.model_dump(), estabelecimento_id=estabelecimento_id)
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    return db_produto

def update_produto(db: Session, produto_id: int, produto: schemas.ProdutoCreate, estabelecimento_id: int):
    db_produto = db.query(models.Produto).filter(models.Produto.id == produto_id, models.Produto.estabelecimento_id == estabelecimento_id).first()
    if db_produto:
        for key, value in produto.model_dump().items():
            setattr(db_produto, key, value)
        db.commit()
        db.refresh(db_produto)
    return db_produto

def delete_produto(db: Session, produto_id: int, estabelecimento_id: int):
    db_produto = db.query(models.Produto).filter(models.Produto.id == produto_id, models.Produto.estabelecimento_id == estabelecimento_id).first()
    if db_produto:
        # Produtos vendidos permanecem como histórico; removê-los do cardápio é uma desativação.
        db_produto.ativo = False
        db.commit()
        db.refresh(db_produto)
    return db_produto

# --- Grupos de opções e adicionais ---
def get_grupos_opcoes(db: Session, estabelecimento_id: int, somente_ativos: bool = False):
    query = db.query(models.GrupoOpcao).filter(models.GrupoOpcao.estabelecimento_id == estabelecimento_id)
    if somente_ativos:
        query = query.filter(models.GrupoOpcao.ativo == True)
    return query.order_by(models.GrupoOpcao.ordem, models.GrupoOpcao.id).all()

def get_grupo_opcao(db: Session, grupo_id: int, estabelecimento_id: int):
    return db.query(models.GrupoOpcao).filter(
        models.GrupoOpcao.id == grupo_id,
        models.GrupoOpcao.estabelecimento_id == estabelecimento_id,
    ).first()

def save_grupo_opcao(db: Session, payload: schemas.GrupoOpcaoCreate, estabelecimento_id: int, grupo_id: int = None):
    if payload.minimo > payload.maximo:
        raise ValueError("O mínimo de escolhas não pode ser maior que o máximo.")
    grupo = get_grupo_opcao(db, grupo_id, estabelecimento_id) if grupo_id else None
    if grupo_id and not grupo:
        return None
    duplicate = db.query(models.GrupoOpcao).filter(
        models.GrupoOpcao.estabelecimento_id == estabelecimento_id,
        func.lower(models.GrupoOpcao.nome) == payload.nome.strip().lower(),
    )
    if grupo_id:
        duplicate = duplicate.filter(models.GrupoOpcao.id != grupo_id)
    if duplicate.first():
        raise ValueError("Já existe um grupo com este nome.")
    values = payload.model_dump(exclude={"opcoes"})
    values["nome"] = values["nome"].strip()
    if grupo:
        for key, value in values.items():
            setattr(grupo, key, value)
        grupo.opcoes.clear()
    else:
        grupo = models.GrupoOpcao(estabelecimento_id=estabelecimento_id, **values)
        db.add(grupo)
    for opcao in payload.opcoes:
        grupo.opcoes.append(models.OpcaoProduto(**opcao.model_dump()))
    db.commit()
    db.refresh(grupo)
    return grupo

def delete_grupo_opcao(db: Session, grupo_id: int, estabelecimento_id: int):
    grupo = get_grupo_opcao(db, grupo_id, estabelecimento_id)
    if not grupo:
        return False
    db.query(models.ProdutoGrupoOpcao).filter(models.ProdutoGrupoOpcao.grupo_id == grupo.id).delete()
    db.delete(grupo)
    db.commit()
    return True

def set_produto_grupos(db: Session, produto_id: int, grupo_ids: list[int], estabelecimento_id: int):
    produto = db.query(models.Produto).filter(
        models.Produto.id == produto_id, models.Produto.estabelecimento_id == estabelecimento_id,
    ).first()
    if not produto:
        return None
    grupos = db.query(models.GrupoOpcao).filter(
        models.GrupoOpcao.estabelecimento_id == estabelecimento_id,
        models.GrupoOpcao.id.in_(grupo_ids),
    ).all() if grupo_ids else []
    if len(grupos) != len(set(grupo_ids)):
        raise ValueError("Um ou mais grupos não pertencem a este estabelecimento.")
    by_id = {grupo.id: grupo for grupo in grupos}
    produto.grupos_opcoes = [by_id[group_id] for group_id in grupo_ids]
    db.commit()
    db.refresh(produto)
    return produto


# --- Clientes ---

def get_cliente(db: Session, cliente_id: int):
    return db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()

def get_cliente_by_google_id(db: Session, google_id: str):
    return db.query(models.Cliente).filter(models.Cliente.google_id == google_id).first()

def get_cliente_by_email(db: Session, email: str):
    return db.query(models.Cliente).filter(models.Cliente.email == email).first()

def create_cliente(db: Session, cliente: schemas.ClienteCreate):
    db_cliente = models.Cliente(**cliente.dict())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

def update_cliente(db: Session, cliente_id: int, updates: schemas.ClienteUpdate):
    db_cliente = get_cliente(db, cliente_id)
    if db_cliente:
        if updates.telefone is not None:
            db_cliente.telefone = updates.telefone
        if updates.endereco is not None:
            db_cliente.endereco = updates.endereco
        db.commit()
        db.refresh(db_cliente)
    return db_cliente

# --- Pedidos ---

def get_pedidos(db: Session, estabelecimento_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Pedido).filter(models.Pedido.estabelecimento_id == estabelecimento_id).order_by(models.Pedido.id.desc()).offset(skip).limit(limit).all()

def get_pedido(db: Session, pedido_id: int, estabelecimento_id: int):
    return db.query(models.Pedido).filter(models.Pedido.id == pedido_id, models.Pedido.estabelecimento_id == estabelecimento_id).first()

def get_pedido_by_public_token(db: Session, token: str, estabelecimento_id: int):
    return db.query(models.Pedido).filter(
        models.Pedido.uuid == token,
        models.Pedido.estabelecimento_id == estabelecimento_id,
    ).first()

def get_pedidos_by_date_range(db: Session, start_date: datetime.datetime, end_date: datetime.datetime, estabelecimento_id: int):
    return db.query(models.Pedido).filter(models.Pedido.estabelecimento_id == estabelecimento_id, models.Pedido.data >= start_date, models.Pedido.data <= end_date).all()

def create_pedido(db: Session, pedido: schemas.PedidoCreate, estabelecimento_id: int):
    if pedido.uuid:
        existing = db.query(models.Pedido).filter(models.Pedido.uuid == pedido.uuid, models.Pedido.estabelecimento_id == estabelecimento_id).first()
        if existing:
            return existing

    # Calcular totais
    subtotal = 0.0
    db_itens = []
    
    for item in pedido.itens:
        produto = db.query(models.Produto).filter(models.Produto.id == item.produto_id, models.Produto.estabelecimento_id == estabelecimento_id).first()
        if not produto or not produto.ativo:
            raise ValueError("Um dos produtos não existe ou está indisponível.")
        if item.quantidade < 1:
            raise ValueError("A quantidade do produto deve ser maior que zero.")
        preco_venda = produto.preco_promocao if (produto.is_promocao and produto.preco_promocao) else produto.preco
        grupos_vinculados = {grupo.id: grupo for grupo in produto.grupos_opcoes if grupo.ativo}
        opcoes_ids = [selecao.opcao_id for selecao in item.opcoes]
        opcoes = db.query(models.OpcaoProduto).join(models.GrupoOpcao).filter(
            models.OpcaoProduto.id.in_(opcoes_ids),
            models.OpcaoProduto.ativo == True,
            models.GrupoOpcao.estabelecimento_id == estabelecimento_id,
        ).all() if opcoes_ids else []
        opcoes_por_id = {opcao.id: opcao for opcao in opcoes}
        if len(opcoes_por_id) != len(set(opcoes_ids)):
            raise ValueError("Uma das opções escolhidas é inválida ou está indisponível.")
        contagem_por_grupo = {grupo_id: 0 for grupo_id in grupos_vinculados}
        snapshots = []
        adicionais_total = 0.0
        for selecao in item.opcoes:
            opcao = opcoes_por_id[selecao.opcao_id]
            if opcao.grupo_id not in grupos_vinculados:
                raise ValueError(f"A opção '{opcao.nome}' não pertence a este produto.")
            contagem_por_grupo[opcao.grupo_id] += selecao.quantidade
            valor = opcao.preco_adicional * selecao.quantidade
            adicionais_total += valor
            snapshots.append(models.ItemPedidoOpcao(
                opcao_id=opcao.id, grupo_nome=opcao.grupo.nome, opcao_nome=opcao.nome,
                preco_unitario=opcao.preco_adicional, quantidade=selecao.quantidade, subtotal=valor,
            ))
        for grupo_id, grupo in grupos_vinculados.items():
            minimo = max(grupo.minimo, 1 if grupo.obrigatorio else 0)
            quantidade_escolhida = contagem_por_grupo[grupo_id]
            if quantidade_escolhida < minimo:
                raise ValueError(f"Escolha pelo menos {minimo} opção(ões) em '{grupo.nome}'.")
            if quantidade_escolhida > grupo.maximo:
                raise ValueError(f"Escolha no máximo {grupo.maximo} opção(ões) em '{grupo.nome}'.")
        item_subtotal = (preco_venda + adicionais_total) * item.quantidade
        subtotal += item_subtotal
        db_itens.append(
            models.ItemPedido(
                produto_id=item.produto_id, produto_nome=produto.nome, observacao=item.observacao,
                quantidade=item.quantidade, custo_unitario=produto.preco_compra or 0.0,
                valor_unitario=preco_venda + adicionais_total, subtotal=item_subtotal, opcoes=snapshots,
            )
        )
        if produto.controlar_estoque:
            if produto.estoque < item.quantidade:
                raise ValueError(f"Estoque insuficiente para o produto '{produto.nome}'. Restam apenas {produto.estoque} unidades.")
            produto.estoque -= item.quantidade
                
        # Baixa de Insumos (Ficha Técnica)
        for ficha in produto.fichas_tecnicas:
            if ficha.insumo and ficha.insumo.controlar_estoque:
                qtde_necessaria = item.quantidade * ficha.quantidade
                if ficha.insumo.estoque < qtde_necessaria:
                    raise ValueError(f"Estoque de insumo insuficiente: '{ficha.insumo.nome}'. Necessário: {qtde_necessaria}, Disponível: {ficha.insumo.estoque}.")
                ficha.insumo.estoque -= qtde_necessaria
            
    taxa_entrega = 0.0
    
    total = subtotal + taxa_entrega
    
    # Gerar numero do pedido baseado na data e id (simplificado: YYYYMMDD-COUNT)
    hoje = (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date()
    count_hoje = db.query(models.Pedido).filter(models.Pedido.estabelecimento_id == estabelecimento_id, func.date(models.Pedido.data) == hoje).count() + 1
    numero_pedido = f"{estabelecimento_id}-{hoje.strftime('%Y%m%d')}-{count_hoje:03d}"

    pedido_uuid = pedido.uuid or str(uuid_lib.uuid4())
    db_pedido = models.Pedido(
        estabelecimento_id=estabelecimento_id,
        uuid=pedido_uuid,
        numero=numero_pedido,
        cliente=pedido.cliente,
        telefone=pedido.telefone,
        endereco=pedido.endereco,
        tipo_entrega=pedido.tipo_entrega,
        forma_pagamento=pedido.forma_pagamento,
        observacao=pedido.observacao,
        cliente_id=pedido.cliente_id,
        subtotal=subtotal,
        taxa_entrega=taxa_entrega,
        total=total,
        status="Recebido"
    )
    
    db.add(db_pedido)
    db.commit()
    db.refresh(db_pedido)
    
    for db_item in db_itens:
        db_item.pedido_id = db_pedido.id
        db.add(db_item)
        
    db.commit()
    db.refresh(db_pedido)
    return db_pedido

def update_pedido_status(db: Session, pedido_id: int, status: str, estabelecimento_id: int):
    db_pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id, models.Pedido.estabelecimento_id == estabelecimento_id).first()
    if db_pedido:
        db_pedido.status = status
        db.commit()
        db.refresh(db_pedido)
    return db_pedido

# --- Configuracoes ---

def get_configuracao(db: Session, estabelecimento_id: int = None):
    import auth
    query = db.query(models.Configuracao)
    config = query.filter(models.Configuracao.estabelecimento_id == estabelecimento_id).first() if estabelecimento_id else query.first()
    if not config:
        config = models.Configuracao(estabelecimento_id=estabelecimento_id, senha_admin=auth.get_password_hash("burger123"))
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

def update_configuracao(db: Session, config: schemas.ConfiguracaoCreate, estabelecimento_id: int):
    import auth
    db_config = db.query(models.Configuracao).filter(models.Configuracao.estabelecimento_id == estabelecimento_id).first()
    config_data = config.model_dump()
    senha_plana = config_data.get("senha_admin")
    
    # Hash password if provided
    if "senha_admin" in config_data and config_data["senha_admin"]:
        config_data["senha_admin"] = auth.get_password_hash(config_data["senha_admin"])

    if not db_config:
        if "senha_admin" not in config_data or not config_data["senha_admin"]:
            config_data["senha_admin"] = auth.get_password_hash("burger123")
        db_config = models.Configuracao(**config_data, estabelecimento_id=estabelecimento_id)
        db.add(db_config)
    else:
        for key, value in config_data.items():
            # Se for senha_admin, só atualiza se tiver vindo um valor novo (não nulo)
            if key == "senha_admin":
                if value:
                    setattr(db_config, key, value)
            else:
                setattr(db_config, key, value)
    db.commit()
    db.refresh(db_config)
    estabelecimento = db.query(models.Estabelecimento).filter(models.Estabelecimento.id == estabelecimento_id).first()
    if estabelecimento:
        estabelecimento.nome = db_config.nome_empresa
        estabelecimento.telefone = db_config.telefone
        estabelecimento.logo = db_config.logo
        estabelecimento.configuracao_id = db_config.id
        db.commit()
    if senha_plana:
        owner = db.query(models.Usuario).filter(
            models.Usuario.estabelecimento_id == estabelecimento_id,
            models.Usuario.perfil == "proprietario",
            models.Usuario.ativo == True,
        ).order_by(models.Usuario.id).first()
        if owner:
            owner.senha_hash = auth.get_password_hash(senha_plana)
            db.commit()
    return db_config

# --- Caixa ---
def get_caixa_aberto(db: Session, estabelecimento_id: int):
    return db.query(models.Caixa).filter(models.Caixa.estabelecimento_id == estabelecimento_id, models.Caixa.status == "aberto").first()

def abrir_caixa(db: Session, caixa: schemas.CaixaCreate, estabelecimento_id: int):
    db_caixa = models.Caixa(**caixa.model_dump(), estabelecimento_id=estabelecimento_id)
    db.add(db_caixa)
    db.commit()
    db.refresh(db_caixa)
    return db_caixa

def fechar_caixa(db: Session, caixa_id: int, estabelecimento_id: int):
    db_caixa = db.query(models.Caixa).filter(models.Caixa.id == caixa_id, models.Caixa.estabelecimento_id == estabelecimento_id).first()
    if db_caixa:
        db_caixa.status = "fechado"
        db_caixa.data_fechamento = datetime.datetime.utcnow() - datetime.timedelta(hours=3)
        
        # Calcular saldo final
        total_entradas = sum(m.valor for m in db_caixa.movimentacoes if m.tipo in ["venda", "suprimento"])
        total_saidas = sum(m.valor for m in db_caixa.movimentacoes if m.tipo == "sangria")
        db_caixa.saldo_final = db_caixa.saldo_inicial + total_entradas - total_saidas
        
        db.commit()
        db.refresh(db_caixa)
    return db_caixa

def add_movimentacao(db: Session, caixa_id: int, movimentacao: schemas.MovimentacaoCaixaCreate):
    db_mov = models.MovimentacaoCaixa(**movimentacao.model_dump(), caixa_id=caixa_id)
    db.add(db_mov)
    db.commit()
    db.refresh(db_mov)
    return db_mov

# --- Insumos ---
def get_insumos(db: Session, estabelecimento_id: int, skip: int = 0, limit: int = 500):
    return db.query(models.Insumo).filter(models.Insumo.estabelecimento_id == estabelecimento_id).offset(skip).limit(limit).all()

def create_insumo(db: Session, insumo: schemas.InsumoCreate, estabelecimento_id: int):
    db_insumo = models.Insumo(**insumo.model_dump(), estabelecimento_id=estabelecimento_id)
    db.add(db_insumo)
    db.commit()
    db.refresh(db_insumo)
    return db_insumo

def update_insumo(db: Session, insumo_id: int, insumo: schemas.InsumoCreate, estabelecimento_id: int):
    db_insumo = db.query(models.Insumo).filter(models.Insumo.id == insumo_id, models.Insumo.estabelecimento_id == estabelecimento_id).first()
    if db_insumo:
        for key, value in insumo.model_dump().items():
            setattr(db_insumo, key, value)
        db.commit()
        db.refresh(db_insumo)
    return db_insumo

def delete_insumo(db: Session, insumo_id: int, estabelecimento_id: int):
    db_insumo = db.query(models.Insumo).filter(models.Insumo.id == insumo_id, models.Insumo.estabelecimento_id == estabelecimento_id).first()
    if db_insumo:
        db.delete(db_insumo)
        db.commit()
    return db_insumo

# --- Ficha Tecnica ---
def get_ficha_tecnica(db: Session, produto_id: int, estabelecimento_id: int):
    produto = db.query(models.Produto).filter(models.Produto.id == produto_id, models.Produto.estabelecimento_id == estabelecimento_id).first()
    return db.query(models.ProdutoInsumo).filter(models.ProdutoInsumo.produto_id == produto_id).all() if produto else []

def update_ficha_tecnica(db: Session, produto_id: int, itens: list[schemas.ProdutoInsumoCreate], estabelecimento_id: int):
    produto = db.query(models.Produto).filter(models.Produto.id == produto_id, models.Produto.estabelecimento_id == estabelecimento_id).first()
    if not produto:
        return []
    # Limpa ficha anterior
    db.query(models.ProdutoInsumo).filter(models.ProdutoInsumo.produto_id == produto_id).delete()
    
    total_cost = 0.0
    for item in itens:
        db_item = models.ProdutoInsumo(produto_id=produto_id, insumo_id=item.insumo_id, quantidade=item.quantidade)
        db.add(db_item)
        
        # Calculate cost
        insumo = db.query(models.Insumo).filter(models.Insumo.id == item.insumo_id, models.Insumo.estabelecimento_id == estabelecimento_id).first()
        if insumo:
            total_cost += insumo.custo_unitario * item.quantidade

    # Atualiza preco de compra do produto
    produto.preco_compra = total_cost
        
    db.commit()
    return get_ficha_tecnica(db, produto_id, estabelecimento_id)

# --- Usuários e auditoria ---
def normalize_email(email: str) -> str:
    return email.strip().lower()

def get_usuario(db: Session, usuario_id: int, estabelecimento_id: int):
    return db.query(models.Usuario).filter(
        models.Usuario.id == usuario_id,
        models.Usuario.estabelecimento_id == estabelecimento_id,
    ).first()

def get_usuario_by_email(db: Session, email: str, estabelecimento_id: int):
    return db.query(models.Usuario).filter(
        models.Usuario.estabelecimento_id == estabelecimento_id,
        func.lower(models.Usuario.email) == normalize_email(email),
    ).first()

def get_usuarios(db: Session, estabelecimento_id: int):
    return db.query(models.Usuario).filter(
        models.Usuario.estabelecimento_id == estabelecimento_id,
    ).order_by(models.Usuario.nome.asc()).all()

def create_usuario(db: Session, payload: schemas.UsuarioCreate, estabelecimento_id: int):
    import auth
    if payload.perfil not in auth.PERFIS:
        raise ValueError("Perfil de usuário inválido.")
    email = normalize_email(payload.email)
    if get_usuario_by_email(db, email, estabelecimento_id):
        raise ValueError("Já existe um usuário com este e-mail neste estabelecimento.")
    usuario = models.Usuario(
        estabelecimento_id=estabelecimento_id,
        nome=payload.nome.strip(),
        email=email,
        senha_hash=auth.get_password_hash(payload.senha),
        perfil=payload.perfil,
        ativo=True,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario

def update_usuario(db: Session, usuario_id: int, payload: schemas.UsuarioUpdate, estabelecimento_id: int):
    import auth
    usuario = get_usuario(db, usuario_id, estabelecimento_id)
    if not usuario:
        return None
    values = payload.model_dump(exclude_unset=True)
    if "perfil" in values and values["perfil"] not in auth.PERFIS:
        raise ValueError("Perfil de usuário inválido.")
    if "email" in values:
        values["email"] = normalize_email(values["email"])
        duplicado = get_usuario_by_email(db, values["email"], estabelecimento_id)
        if duplicado and duplicado.id != usuario_id:
            raise ValueError("Já existe um usuário com este e-mail neste estabelecimento.")
    senha = values.pop("senha", None)
    if senha:
        values["senha_hash"] = auth.get_password_hash(senha)
    for key, value in values.items():
        setattr(usuario, key, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(usuario)
    return usuario

def ensure_owner_user(db: Session, estabelecimento: models.Estabelecimento, password: str):
    import auth
    owner = db.query(models.Usuario).filter(
        models.Usuario.estabelecimento_id == estabelecimento.id,
        models.Usuario.perfil == "proprietario",
    ).first()
    if owner:
        return owner
    email = normalize_email(estabelecimento.email or f"proprietario@{estabelecimento.slug}.ritmesa")
    owner = models.Usuario(
        estabelecimento_id=estabelecimento.id,
        nome=estabelecimento.nome,
        email=email,
        senha_hash=auth.get_password_hash(password),
        perfil="proprietario",
        ativo=True,
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return owner

def create_audit_log(db: Session, estabelecimento_id: int, acao: str, usuario_id=None,
                     entidade=None, entidade_id=None, detalhes=None, ip=None, user_agent=None):
    import json
    log = models.LogAuditoria(
        estabelecimento_id=estabelecimento_id,
        usuario_id=usuario_id,
        acao=acao,
        entidade=entidade,
        entidade_id=str(entidade_id) if entidade_id is not None else None,
        detalhes=json.dumps(detalhes, ensure_ascii=False, default=str) if detalhes is not None else None,
        ip=ip,
        user_agent=user_agent,
    )
    db.add(log)
    db.commit()
    return log

# --- Administração da plataforma Ritmesa ---
def ensure_initial_establishment(db: Session):
    existente = db.query(models.Estabelecimento).filter(models.Estabelecimento.slug == "bisburger").first()
    if existente:
        config = db.query(models.Configuracao).filter(models.Configuracao.id == existente.configuracao_id).first()
        if config and not config.estabelecimento_id:
            config.estabelecimento_id = existente.id
            db.commit()
        return existente
    config = get_configuracao(db)
    estabelecimento = models.Estabelecimento(
        nome=config.nome_empresa or "BisBurger",
        slug="bisburger",
        telefone=config.telefone,
        logo=config.logo,
        plano="Profissional",
        status="ativo",
        configuracao_id=config.id,
    )
    db.add(estabelecimento)
    db.flush()
    config.estabelecimento_id = estabelecimento.id
    estabelecimento.configuracao_id = config.id
    for model in (models.Produto, models.Pedido, models.Caixa, models.Insumo, models.Cliente, models.WhatsAppContato):
        db.query(model).filter(model.estabelecimento_id == None).update({"estabelecimento_id": estabelecimento.id})
    db.commit()
    return estabelecimento

def get_estabelecimento_by_slug(db: Session, slug: str, include_inactive: bool = False):
    ensure_initial_establishment(db)
    query = db.query(models.Estabelecimento).filter(models.Estabelecimento.slug == slug.strip().lower())
    if not include_inactive:
        query = query.filter(models.Estabelecimento.status.in_(("ativo", "trial")))
    return query.first()

def get_estabelecimentos(db: Session):
    ensure_initial_establishment(db)
    return db.query(models.Estabelecimento).order_by(models.Estabelecimento.data_cadastro.desc()).all()

def create_estabelecimento(db: Session, payload: schemas.EstabelecimentoCreate):
    import auth
    existente = db.query(models.Estabelecimento).filter(models.Estabelecimento.slug == payload.slug).first()
    if existente:
        raise ValueError("Este endereço de cardápio já está em uso.")
    data = payload.model_dump(exclude={"senha_inicial"})
    estabelecimento = models.Estabelecimento(**data)
    db.add(estabelecimento)
    db.flush()
    config = models.Configuracao(
        estabelecimento_id=estabelecimento.id,
        nome_empresa=estabelecimento.nome,
        telefone=estabelecimento.telefone,
        logo=estabelecimento.logo,
        taxa_entrega=0,
        tempo_medio_preparo=30,
        senha_admin=auth.get_password_hash(payload.senha_inicial),
    )
    db.add(config)
    db.flush()
    estabelecimento.configuracao_id = config.id
    db.commit()
    db.refresh(estabelecimento)
    ensure_owner_user(db, estabelecimento, payload.senha_inicial)
    return estabelecimento

def update_estabelecimento(db: Session, estabelecimento_id: int, payload: schemas.EstabelecimentoUpdate):
    estabelecimento = db.query(models.Estabelecimento).filter(models.Estabelecimento.id == estabelecimento_id).first()
    if not estabelecimento:
        return None
    values = payload.model_dump(exclude_unset=True)
    if "slug" in values:
        duplicado = db.query(models.Estabelecimento).filter(
            models.Estabelecimento.slug == values["slug"],
            models.Estabelecimento.id != estabelecimento_id,
        ).first()
        if duplicado:
            raise ValueError("Este endereço de cardápio já está em uso.")
    for key, value in values.items():
        setattr(estabelecimento, key, value)
    db.commit()
    db.refresh(estabelecimento)
    return estabelecimento

def create_lead(db: Session, payload: schemas.LeadComercialCreate):
    lead = models.LeadComercial(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

def get_leads(db: Session):
    return db.query(models.LeadComercial).order_by(models.LeadComercial.data_cadastro.desc()).all()

def update_lead(db: Session, lead_id: int, payload: schemas.LeadComercialUpdate):
    lead = db.query(models.LeadComercial).filter(models.LeadComercial.id == lead_id).first()
    if not lead:
        return None
    lead.status = payload.status
    db.commit()
    db.refresh(lead)
    return lead
