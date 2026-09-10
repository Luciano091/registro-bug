from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas
import datetime
import uuid as uuid_lib
import json

# --- Produtos ---
def get_produtos(db: Session, estabelecimento_id: int, skip: int = 0, limit: int = 100, somente_ativos: bool = False, canal: str = None):
    query = db.query(models.Produto).filter(models.Produto.estabelecimento_id == estabelecimento_id)
    if somente_ativos:
        query = query.filter(models.Produto.ativo == True)
    produtos = query.offset(skip).limit(limit).all()
    if somente_ativos:
        produtos = [produto for produto in produtos if produto_disponivel_agora(produto)]
    if canal == "delivery":
        produtos = [produto for produto in produtos if produto.disponivel_delivery]
    elif canal == "retirada":
        produtos = [produto for produto in produtos if produto.disponivel_retirada]
    elif canal == "salao":
        produtos = [produto for produto in produtos if produto.disponivel_salao]
    return produtos

def dentro_do_horario(dias_semana: str, horario_inicio: str, horario_fim: str, agora=None):
    agora = agora or models.get_now()
    dias = {int(value) for value in (dias_semana or "0,1,2,3,4,5,6").split(",") if value.strip().isdigit()}
    if not horario_inicio or not horario_fim:
        return agora.weekday() in dias
    inicio = datetime.time.fromisoformat(horario_inicio)
    fim = datetime.time.fromisoformat(horario_fim)
    atual = agora.time().replace(second=0, microsecond=0)
    if inicio <= fim:
        return agora.weekday() in dias and inicio <= atual <= fim
    return (agora.weekday() in dias and atual >= inicio) or ((agora.weekday() - 1) % 7 in dias and atual <= fim)

def produto_disponivel_agora(produto: models.Produto):
    if not produto.ativo or not dentro_do_horario(produto.dias_semana, produto.horario_inicio, produto.horario_fim):
        return False
    categoria = produto.categoria_obj
    return not categoria or (categoria.ativo and dentro_do_horario(categoria.dias_semana, categoria.horario_inicio, categoria.horario_fim))

def preco_vigente(produto: models.Produto):
    return produto.preco_promocao if produto.promocao_ativa else produto.preco

def create_produto(db: Session, produto: schemas.ProdutoCreate, estabelecimento_id: int):
    values = produto.model_dump()
    if values.get("categoria_id"):
        categoria = get_categoria(db, values["categoria_id"], estabelecimento_id)
        if not categoria:
            raise ValueError("Categoria inválida para este estabelecimento.")
        values["categoria"] = categoria.nome
    else:
        categoria = db.query(models.Categoria).filter(models.Categoria.estabelecimento_id == estabelecimento_id, func.lower(models.Categoria.nome) == values["categoria"].strip().lower()).first()
        if categoria:
            values["categoria_id"] = categoria.id
    db_produto = models.Produto(**values, estabelecimento_id=estabelecimento_id)
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    return db_produto

def update_produto(db: Session, produto_id: int, produto: schemas.ProdutoCreate, estabelecimento_id: int):
    db_produto = db.query(models.Produto).filter(models.Produto.id == produto_id, models.Produto.estabelecimento_id == estabelecimento_id).first()
    if db_produto:
        values = produto.model_dump()
        if values.get("categoria_id"):
            categoria = get_categoria(db, values["categoria_id"], estabelecimento_id)
            if not categoria:
                raise ValueError("Categoria inválida para este estabelecimento.")
            values["categoria"] = categoria.nome
        else:
            categoria = db.query(models.Categoria).filter(models.Categoria.estabelecimento_id == estabelecimento_id, func.lower(models.Categoria.nome) == values["categoria"].strip().lower()).first()
            values["categoria_id"] = categoria.id if categoria else None
        for key, value in values.items():
            setattr(db_produto, key, value)
        db.commit()
        db.refresh(db_produto)
    return db_produto

# --- Categorias e disponibilidade ---
def get_categorias(db: Session, estabelecimento_id: int, somente_disponiveis: bool = False):
    categorias = db.query(models.Categoria).filter(models.Categoria.estabelecimento_id == estabelecimento_id).order_by(models.Categoria.ordem, models.Categoria.nome).all()
    return [categoria for categoria in categorias if not somente_disponiveis or (categoria.ativo and dentro_do_horario(categoria.dias_semana, categoria.horario_inicio, categoria.horario_fim))]

def get_categoria(db: Session, categoria_id: int, estabelecimento_id: int):
    return db.query(models.Categoria).filter(models.Categoria.id == categoria_id, models.Categoria.estabelecimento_id == estabelecimento_id).first()

def save_categoria(db: Session, payload: schemas.CategoriaCreate, estabelecimento_id: int, categoria_id: int = None):
    categoria = get_categoria(db, categoria_id, estabelecimento_id) if categoria_id else None
    if categoria_id and not categoria:
        return None
    duplicate = db.query(models.Categoria).filter(models.Categoria.estabelecimento_id == estabelecimento_id, func.lower(models.Categoria.nome) == payload.nome.strip().lower())
    if categoria_id:
        duplicate = duplicate.filter(models.Categoria.id != categoria_id)
    if duplicate.first():
        raise ValueError("Já existe uma categoria com este nome.")
    values = payload.model_dump()
    values["nome"] = values["nome"].strip()
    if categoria:
        nome_antigo = categoria.nome
        for key, value in values.items():
            setattr(categoria, key, value)
        db.query(models.Produto).filter(models.Produto.estabelecimento_id == estabelecimento_id, models.Produto.categoria == nome_antigo).update({"categoria": categoria.nome})
    else:
        categoria = models.Categoria(estabelecimento_id=estabelecimento_id, **values)
        db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria

def delete_categoria(db: Session, categoria_id: int, estabelecimento_id: int):
    categoria = get_categoria(db, categoria_id, estabelecimento_id)
    if not categoria:
        return None
    categoria.ativo = False
    db.commit()
    db.refresh(categoria)
    return categoria

def get_cupons(db: Session, estabelecimento_id: int):
    return db.query(models.Cupom).filter(models.Cupom.estabelecimento_id == estabelecimento_id).order_by(models.Cupom.id.desc()).all()

def get_cupom(db: Session, cupom_id: int, estabelecimento_id: int):
    return db.query(models.Cupom).filter(models.Cupom.id == cupom_id, models.Cupom.estabelecimento_id == estabelecimento_id).first()

def save_cupom(db: Session, payload: schemas.CupomCreate, estabelecimento_id: int, cupom_id: int = None):
    if payload.tipo not in ("percentual", "fixo"):
        raise ValueError("O tipo do cupom deve ser percentual ou fixo.")
    if payload.tipo == "percentual" and payload.valor > 100:
        raise ValueError("O desconto percentual não pode ultrapassar 100%.")
    if payload.inicio and payload.fim and payload.inicio >= payload.fim:
        raise ValueError("A data final deve ser posterior à data inicial.")
    cupom = get_cupom(db, cupom_id, estabelecimento_id) if cupom_id else None
    if cupom_id and not cupom:
        return None
    codigo = payload.codigo.strip().upper()
    duplicate = db.query(models.Cupom).filter(models.Cupom.estabelecimento_id == estabelecimento_id, func.upper(models.Cupom.codigo) == codigo)
    if cupom_id:
        duplicate = duplicate.filter(models.Cupom.id != cupom_id)
    if duplicate.first():
        raise ValueError("Já existe um cupom com este código.")
    values = payload.model_dump()
    values["codigo"] = codigo
    if cupom:
        for key, value in values.items():
            setattr(cupom, key, value)
    else:
        cupom = models.Cupom(estabelecimento_id=estabelecimento_id, **values)
        db.add(cupom)
    db.commit()
    db.refresh(cupom)
    return cupom

def validar_cupom(db: Session, codigo: str, subtotal: float, estabelecimento_id: int, bloquear: bool = False):
    codigo_normalizado = (codigo or "").strip().upper()
    query = db.query(models.Cupom).filter(
        models.Cupom.estabelecimento_id == estabelecimento_id,
        func.upper(models.Cupom.codigo) == codigo_normalizado,
    )
    cupom = (query.with_for_update() if bloquear else query).first()
    agora = models.get_now()
    if not cupom or not cupom.ativo:
        raise ValueError("Cupom inválido ou inativo.")
    if cupom.inicio and agora < cupom.inicio:
        raise ValueError("Este cupom ainda não está disponível.")
    if cupom.fim and agora > cupom.fim:
        raise ValueError("Este cupom expirou.")
    if cupom.limite_usos is not None and cupom.usos >= cupom.limite_usos:
        raise ValueError("Este cupom atingiu o limite de usos.")
    if subtotal < cupom.pedido_minimo:
        raise ValueError(f"Pedido mínimo de R$ {cupom.pedido_minimo:.2f} para usar este cupom.")
    desconto = subtotal * cupom.valor / 100 if cupom.tipo == "percentual" else cupom.valor
    desconto = round(min(subtotal, desconto), 2)
    return cupom, desconto

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
        if not produto_disponivel_agora(produto):
            raise ValueError(f"O produto '{produto.nome}' não está disponível neste horário.")
        if pedido.tipo_entrega.lower() in ("delivery", "entrega") and not produto.disponivel_delivery:
            raise ValueError(f"O produto '{produto.nome}' não está disponível para entrega.")
        if pedido.tipo_entrega.lower() == "retirada" and not produto.disponivel_retirada:
            raise ValueError(f"O produto '{produto.nome}' não está disponível para retirada.")
        if pedido.tipo_entrega.lower() in ("salao", "salão", "mesa") and not produto.disponivel_salao:
            raise ValueError(f"O produto '{produto.nome}' não está disponível para consumo no salão.")
        preco_venda = preco_vigente(produto)
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
    
    cupom = None
    desconto = 0.0
    if pedido.cupom_codigo:
        cupom, desconto = validar_cupom(db, pedido.cupom_codigo, subtotal, estabelecimento_id, bloquear=True)
    total = max(0.0, subtotal + taxa_entrega - desconto)
    
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
        cupom_codigo=cupom.codigo if cupom else None,
        desconto=desconto,
        total=total,
        status="Recebido"
    )
    
    db.add(db_pedido)
    if cupom:
        cupom.usos += 1
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

# --- Salão, mesas e comandas ---
def get_mesas(db: Session, estabelecimento_id: int):
    return db.query(models.Mesa).filter(models.Mesa.estabelecimento_id == estabelecimento_id).order_by(models.Mesa.ordem, models.Mesa.numero).all()

def get_mesa(db: Session, mesa_id: int, estabelecimento_id: int):
    return db.query(models.Mesa).filter(models.Mesa.id == mesa_id, models.Mesa.estabelecimento_id == estabelecimento_id).first()

def save_mesa(db: Session, payload: schemas.MesaCreate, estabelecimento_id: int, mesa_id: int = None):
    mesa = get_mesa(db, mesa_id, estabelecimento_id) if mesa_id else None
    if mesa_id and not mesa:
        return None
    numero = payload.numero.strip()
    duplicate = db.query(models.Mesa).filter(models.Mesa.estabelecimento_id == estabelecimento_id, func.lower(models.Mesa.numero) == numero.lower())
    if mesa_id:
        duplicate = duplicate.filter(models.Mesa.id != mesa_id)
    if duplicate.first():
        raise ValueError("Já existe uma mesa com este número.")
    values = payload.model_dump(); values["numero"] = numero
    if mesa:
        if mesa.status == "ocupada" and not payload.ativo:
            raise ValueError("Feche ou transfira a comanda antes de desativar a mesa.")
        for key, value in values.items(): setattr(mesa, key, value)
        if not mesa.ativo: mesa.status = "inativa"
        elif mesa.status == "inativa": mesa.status = "livre"
    else:
        mesa = models.Mesa(estabelecimento_id=estabelecimento_id, status="livre" if payload.ativo else "inativa", **values)
        db.add(mesa)
    db.commit(); db.refresh(mesa)
    return mesa

def get_comanda(db: Session, comanda_id: int, estabelecimento_id: int):
    return db.query(models.Comanda).filter(models.Comanda.id == comanda_id, models.Comanda.estabelecimento_id == estabelecimento_id).first()

def get_comanda_aberta_mesa(db: Session, mesa_id: int, estabelecimento_id: int):
    return db.query(models.Comanda).filter(models.Comanda.mesa_id == mesa_id, models.Comanda.estabelecimento_id == estabelecimento_id, models.Comanda.status.in_(("aberta", "aguardando_pagamento"))).first()

def abrir_comanda(db: Session, payload: schemas.ComandaAbrir, usuario):
    mesa = get_mesa(db, payload.mesa_id, usuario.estabelecimento_id)
    if not mesa or not mesa.ativo or mesa.status != "livre":
        raise ValueError("A mesa não está disponível.")
    if get_comanda_aberta_mesa(db, mesa.id, usuario.estabelecimento_id):
        raise ValueError("Esta mesa já possui uma comanda aberta.")
    sequencia = db.query(models.Comanda).filter(models.Comanda.estabelecimento_id == usuario.estabelecimento_id).count() + 1
    comanda = models.Comanda(
        estabelecimento_id=usuario.estabelecimento_id, mesa_id=mesa.id, numero=f"C{sequencia:05d}",
        cliente=payload.cliente, pessoas=payload.pessoas, observacao=payload.observacao,
        aberta_por_id=usuario.usuario_id, aberta_por_nome=usuario.nome,
    )
    mesa.status = "ocupada"; db.add(comanda); db.commit(); db.refresh(comanda)
    return comanda

def recalcular_comanda(comanda):
    comanda.subtotal = round(sum(item.subtotal for item in comanda.itens if item.status != "cancelado"), 2)
    comanda.total = round(max(0, comanda.subtotal - comanda.desconto + comanda.taxa_servico), 2)

def adicionar_item_comanda(db: Session, comanda_id: int, payload: schemas.ComandaItemAdicionar, usuario):
    comanda = get_comanda(db, comanda_id, usuario.estabelecimento_id)
    if not comanda or comanda.status != "aberta":
        raise ValueError("A comanda não está aberta para lançamentos.")
    produto = db.query(models.Produto).filter(models.Produto.id == payload.produto_id, models.Produto.estabelecimento_id == usuario.estabelecimento_id).first()
    if not produto or not produto_disponivel_agora(produto) or not produto.disponivel_salao:
        raise ValueError("Produto indisponível para o salão neste momento.")
    grupos = {grupo.id: grupo for grupo in produto.grupos_opcoes if grupo.ativo}
    ids = [selecao.opcao_id for selecao in payload.opcoes]
    opcoes = db.query(models.OpcaoProduto).join(models.GrupoOpcao).filter(models.OpcaoProduto.id.in_(ids), models.OpcaoProduto.ativo == True, models.GrupoOpcao.estabelecimento_id == usuario.estabelecimento_id).all() if ids else []
    por_id = {opcao.id: opcao for opcao in opcoes}
    if len(por_id) != len(set(ids)):
        raise ValueError("Uma das opções selecionadas é inválida.")
    contagem = {grupo_id: 0 for grupo_id in grupos}; extras = 0.0; snapshots = []
    for selecao in payload.opcoes:
        opcao = por_id[selecao.opcao_id]
        if opcao.grupo_id not in grupos:
            raise ValueError(f"A opção '{opcao.nome}' não pertence ao produto.")
        contagem[opcao.grupo_id] += selecao.quantidade
        extras += opcao.preco_adicional * selecao.quantidade
        snapshots.append({"grupo": opcao.grupo.nome, "opcao": opcao.nome, "quantidade": selecao.quantidade, "preco": opcao.preco_adicional})
    for grupo_id, grupo in grupos.items():
        minimo = max(grupo.minimo, 1 if grupo.obrigatorio else 0)
        if contagem[grupo_id] < minimo or contagem[grupo_id] > grupo.maximo:
            raise ValueError(f"Revise a quantidade de escolhas em '{grupo.nome}'.")
    if produto.controlar_estoque and produto.estoque < payload.quantidade:
        raise ValueError(f"Estoque insuficiente para '{produto.nome}'.")
    valor = preco_vigente(produto) + extras
    item = models.ComandaItem(
        produto_id=produto.id, produto_nome=produto.nome, quantidade=payload.quantidade, custo_unitario=produto.preco_compra or 0,
        valor_unitario=valor, subtotal=round(valor * payload.quantidade, 2), observacao=payload.observacao,
        opcoes_json=json.dumps(snapshots, ensure_ascii=False), criado_por_id=usuario.usuario_id,
    )
    comanda.itens.append(item)
    if produto.controlar_estoque: produto.estoque -= payload.quantidade
    for ficha in produto.fichas_tecnicas:
        if ficha.insumo and ficha.insumo.controlar_estoque:
            necessario = payload.quantidade * ficha.quantidade
            if ficha.insumo.estoque < necessario: raise ValueError(f"Estoque de insumo insuficiente: '{ficha.insumo.nome}'.")
            ficha.insumo.estoque -= necessario
    recalcular_comanda(comanda); db.commit(); db.refresh(comanda)
    return comanda

def atualizar_status_item_comanda(db: Session, item_id: int, status_item: str, estabelecimento_id: int):
    permitidos = ("enviado", "em_preparo", "pronto", "servido")
    if status_item not in permitidos: raise ValueError("Status de item inválido.")
    item = db.query(models.ComandaItem).join(models.Comanda).filter(models.ComandaItem.id == item_id, models.Comanda.estabelecimento_id == estabelecimento_id, models.Comanda.status == "aberta").first()
    if not item or item.status == "cancelado": return None
    item.status = status_item; item.atualizado_em = models.get_now(); db.commit(); db.refresh(item)
    return item

def cancelar_item_comanda(db: Session, item_id: int, estabelecimento_id: int):
    item = db.query(models.ComandaItem).join(models.Comanda).filter(models.ComandaItem.id == item_id, models.Comanda.estabelecimento_id == estabelecimento_id, models.Comanda.status == "aberta").first()
    if not item or item.status == "cancelado": return None
    produto = db.query(models.Produto).filter(models.Produto.id == item.produto_id, models.Produto.estabelecimento_id == estabelecimento_id).first()
    if produto and produto.controlar_estoque: produto.estoque += item.quantidade
    if produto:
        for ficha in produto.fichas_tecnicas:
            if ficha.insumo and ficha.insumo.controlar_estoque: ficha.insumo.estoque += item.quantidade * ficha.quantidade
    item.status = "cancelado"; item.atualizado_em = models.get_now(); recalcular_comanda(item.comanda); db.commit(); db.refresh(item.comanda)
    return item.comanda

def transferir_comanda(db: Session, comanda_id: int, mesa_destino_id: int, estabelecimento_id: int):
    comanda = get_comanda(db, comanda_id, estabelecimento_id); destino = get_mesa(db, mesa_destino_id, estabelecimento_id)
    if not comanda or comanda.status != "aberta": raise ValueError("Comanda indisponível para transferência.")
    if not destino or not destino.ativo or destino.status != "livre": raise ValueError("A mesa de destino não está livre.")
    origem = comanda.mesa; origem.status = "livre"; destino.status = "ocupada"; comanda.mesa_id = destino.id
    db.commit(); db.refresh(comanda); return comanda

def unir_comandas(db: Session, destino_id: int, origem_id: int, estabelecimento_id: int):
    destino = get_comanda(db, destino_id, estabelecimento_id); origem = get_comanda(db, origem_id, estabelecimento_id)
    if not destino or not origem or destino.id == origem.id or destino.status != "aberta" or origem.status != "aberta": raise ValueError("Selecione duas comandas abertas diferentes.")
    for item in list(origem.itens): item.comanda = destino
    origem.status = "unida"; origem.fechada_em = models.get_now(); origem.mesa.status = "livre"
    recalcular_comanda(destino); db.commit(); db.refresh(destino); return destino

def cancelar_comanda(db: Session, comanda_id: int, estabelecimento_id: int):
    comanda = get_comanda(db, comanda_id, estabelecimento_id)
    if not comanda or comanda.status != "aberta": raise ValueError("Comanda indisponível para cancelamento.")
    for item in comanda.itens:
        if item.status != "cancelado": cancelar_item_comanda(db, item.id, estabelecimento_id)
    comanda.status = "cancelada"; comanda.fechada_em = models.get_now(); comanda.mesa.status = "livre"; db.commit(); db.refresh(comanda)
    return comanda

def fechar_comanda(db: Session, comanda_id: int, payload: schemas.ComandaFechar, estabelecimento_id: int):
    comanda = get_comanda(db, comanda_id, estabelecimento_id)
    if not comanda or comanda.status not in ("aberta", "aguardando_pagamento"): raise ValueError("Comanda indisponível para fechamento.")
    recalcular_comanda(comanda)
    if comanda.subtotal <= 0: raise ValueError("A comanda não possui itens para cobrança.")
    if payload.desconto > comanda.subtotal: raise ValueError("O desconto não pode ultrapassar o subtotal.")
    comanda.desconto = round(payload.desconto, 2)
    comanda.taxa_servico = round((comanda.subtotal - comanda.desconto) * payload.taxa_servico_percentual / 100, 2)
    recalcular_comanda(comanda)
    pago = round(sum(item.valor for item in payload.pagamentos), 2)
    if abs(pago - comanda.total) > 0.02: raise ValueError(f"Os pagamentos devem somar R$ {comanda.total:.2f}.")
    caixa = get_caixa_aberto(db, estabelecimento_id)
    if not caixa: raise ValueError("Abra o caixa antes de fechar a comanda.")
    hoje = models.get_now().date(); sequencia = db.query(models.Pedido).filter(models.Pedido.estabelecimento_id == estabelecimento_id, func.date(models.Pedido.data) == hoje).count() + 1
    pedido = models.Pedido(
        estabelecimento_id=estabelecimento_id, uuid=str(uuid_lib.uuid4()), numero=f"{estabelecimento_id}-{hoje.strftime('%Y%m%d')}-{sequencia:03d}",
        cliente=comanda.cliente or f"Mesa {comanda.mesa.numero}", telefone="", tipo_entrega="Salão", forma_pagamento="Dividido" if len(payload.pagamentos) > 1 else payload.pagamentos[0].forma_pagamento,
        status="Concluído", subtotal=comanda.subtotal, desconto=comanda.desconto, taxa_entrega=0, taxa_servico=comanda.taxa_servico,
        total=comanda.total, origem="salao", comanda_id=comanda.id, observacao=comanda.observacao,
    )
    for item in comanda.itens:
        if item.status != "cancelado": pedido.itens.append(models.ItemPedido(produto_id=item.produto_id, produto_nome=item.produto_nome, quantidade=item.quantidade, custo_unitario=item.custo_unitario, valor_unitario=item.valor_unitario, subtotal=item.subtotal, observacao=item.observacao))
    for pagamento in payload.pagamentos:
        comanda.pagamentos.append(models.ComandaPagamento(forma_pagamento=pagamento.forma_pagamento, valor=pagamento.valor))
        caixa.movimentacoes.append(models.MovimentacaoCaixa(tipo="venda", valor=pagamento.valor, forma_pagamento=pagamento.forma_pagamento, descricao=f"Comanda {comanda.numero} · Mesa {comanda.mesa.numero}"))
    comanda.status = "fechada"; comanda.fechada_em = models.get_now(); comanda.mesa.status = "livre"; db.add(pedido); db.commit(); db.refresh(comanda)
    return comanda

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
    # O estabelecimento legado só deve ser criado quando a base ainda não possui
    # nenhum tenant. Isso evita reutilizar a configuração de um cliente novo.
    primeiro = db.query(models.Estabelecimento).order_by(models.Estabelecimento.id).first()
    if primeiro:
        return primeiro
    config = db.query(models.Configuracao).filter(models.Configuracao.estabelecimento_id == None).first()
    if not config:
        config = models.Configuracao(nome_empresa="BisBurger")
        db.add(config)
        db.flush()
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
