import datetime
import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

import auth
import models
import schemas
from database import get_db


router = APIRouter(prefix="/whatsapp", tags=["WhatsApp local"])


def _local_naive(value: datetime.datetime | None):
    """Keep gateway timestamps consistent with the app's America/Maceio storage."""
    if value is None:
        return models.get_now()
    if value.tzinfo is None:
        return value
    maceio = datetime.timezone(datetime.timedelta(hours=-3))
    return value.astimezone(maceio).replace(tzinfo=None)


def _gateway_auth(x_gateway_token: str | None = Header(default=None, alias="X-Gateway-Token")):
    configured = os.getenv("WHATSAPP_GATEWAY_TOKEN", "").strip()
    if not configured:
        raise HTTPException(status_code=503, detail="Gateway local não configurado.")
    if not x_gateway_token or not hmac.compare_digest(x_gateway_token, configured):
        raise HTTPException(status_code=401, detail="Credencial do gateway inválida.")


def _establishment(db: Session, slug: str):
    establishment = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.slug == slug,
        models.Estabelecimento.status.in_(("ativo", "trial")),
    ).first()
    if not establishment:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado.")
    return establishment


def _conversation(db: Session, establishment_id: int, chat_id: str, telefone: str | None = None, nome: str | None = None):
    conversation = db.query(models.WhatsAppConversation).filter(
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
        models.WhatsAppConversation.chat_id == chat_id,
    ).first()
    if not conversation:
        conversation = models.WhatsAppConversation(
            estabelecimento_id=establishment_id,
            chat_id=chat_id,
            telefone=telefone,
            nome=nome,
        )
        db.add(conversation)
        db.flush()
    else:
        if telefone:
            conversation.telefone = telefone
        if nome:
            conversation.nome = nome
    return conversation


def _serialize_message(message):
    return {
        "id": message.id,
        "external_id": message.external_id,
        "direcao": message.direcao,
        "remetente": message.remetente,
        "texto": message.texto,
        "status": message.status,
        "criado_em": message.criado_em,
        "enviado_em": message.enviado_em,
        "erro": message.erro,
    }


def _serialize_conversation(conversation, include_messages=False):
    data = {
        "id": conversation.id,
        "chat_id": conversation.chat_id,
        "telefone": conversation.telefone,
        "nome": conversation.nome,
        "atendimento_modo": conversation.atendimento_modo,
        "handoff_requested": conversation.handoff_requested,
        "nao_lidas": conversation.nao_lidas,
        "ultima_mensagem": conversation.ultima_mensagem,
        "ultima_interacao": conversation.ultima_interacao,
    }
    if include_messages:
        data["mensagens"] = [_serialize_message(item) for item in conversation.mensagens]
    return data


def _gateway_state_payload(state):
    if not state:
        return {
            "connection": "offline", "connected_number": None,
            "automation_enabled": False, "needs_qr": False,
            "last_seen_at": None, "online": False, "error_message": None,
        }
    age = (models.get_now() - state.last_seen_at).total_seconds()
    return {
        "connection": state.connection,
        "connected_number": state.connected_number,
        "automation_enabled": state.automation_enabled,
        "needs_qr": state.needs_qr,
        "last_seen_at": state.last_seen_at,
        "online": age <= 45 and state.connection == "ready",
        "error_message": state.error_message,
    }


@router.get("/inbox/summary")
def inbox_summary(
    db: Session = Depends(get_db),
    establishment_id: int = Depends(auth.require_permission("whatsapp.visualizar")),
):
    conversations = db.query(models.WhatsAppConversation).filter(
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
    ).all()
    state = db.query(models.WhatsAppGatewayState).filter(
        models.WhatsAppGatewayState.estabelecimento_id == establishment_id,
    ).first()
    latest_incoming = db.query(models.WhatsAppChatMessage.id).join(
        models.WhatsAppConversation,
        models.WhatsAppConversation.id == models.WhatsAppChatMessage.conversa_id,
    ).filter(
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
        models.WhatsAppChatMessage.direcao == "in",
    ).order_by(models.WhatsAppChatMessage.id.desc()).first()
    return {
        "gateway": _gateway_state_payload(state),
        "unread": sum(item.nao_lidas or 0 for item in conversations),
        "waiting_human": sum(1 for item in conversations if item.handoff_requested),
        "latest_incoming_id": latest_incoming[0] if latest_incoming else None,
    }


@router.get("/inbox")
def inbox(
    db: Session = Depends(get_db),
    establishment_id: int = Depends(auth.require_permission("whatsapp.visualizar")),
):
    conversations = db.query(models.WhatsAppConversation).filter(
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
    ).order_by(models.WhatsAppConversation.ultima_interacao.desc()).all()
    state = db.query(models.WhatsAppGatewayState).filter(
        models.WhatsAppGatewayState.estabelecimento_id == establishment_id,
    ).first()
    return {
        "gateway": _gateway_state_payload(state),
        "conversations": [_serialize_conversation(item) for item in conversations],
    }


@router.get("/inbox/{conversation_id}")
def conversation_detail(
    conversation_id: int,
    db: Session = Depends(get_db),
    establishment_id: int = Depends(auth.require_permission("whatsapp.visualizar")),
):
    conversation = db.query(models.WhatsAppConversation).options(
        selectinload(models.WhatsAppConversation.mensagens),
    ).filter(
        models.WhatsAppConversation.id == conversation_id,
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    return _serialize_conversation(conversation, include_messages=True)


@router.delete("/inbox/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    establishment_id: int = Depends(auth.require_permission("whatsapp.enviar")),
):
    conversation = db.query(models.WhatsAppConversation).filter(
        models.WhatsAppConversation.id == conversation_id,
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    db.delete(conversation)
    db.commit()
    return {"status": "deleted", "conversation_id": conversation_id}


@router.post("/inbox/{conversation_id}/read")
def mark_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    establishment_id: int = Depends(auth.require_permission("whatsapp.visualizar")),
):
    conversation = db.query(models.WhatsAppConversation).filter(
        models.WhatsAppConversation.id == conversation_id,
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    conversation.nao_lidas = 0
    db.commit()
    return {"status": "ok"}


@router.post("/inbox/{conversation_id}/messages")
def queue_manual_message(
    conversation_id: int,
    payload: schemas.WhatsAppManualMessageCreate,
    db: Session = Depends(get_db),
    establishment_id: int = Depends(auth.require_permission("whatsapp.enviar")),
):
    text = payload.texto.strip()
    if not text or len(text) > 4000:
        raise HTTPException(status_code=400, detail="Mensagem vazia ou muito longa.")
    conversation = db.query(models.WhatsAppConversation).filter(
        models.WhatsAppConversation.id == conversation_id,
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    message = models.WhatsAppChatMessage(
        conversa_id=conversation.id,
        direcao="out",
        remetente="humano",
        texto=text,
        status="queued",
    )
    conversation.atendimento_modo = "human"
    conversation.handoff_requested = True
    conversation.ultima_mensagem = text
    conversation.ultima_interacao = models.get_now()
    db.add(message)
    db.commit()
    db.refresh(message)
    return _serialize_message(message)


@router.post("/inbox/{conversation_id}/mode")
def update_conversation_mode(
    conversation_id: int,
    payload: schemas.WhatsAppConversationModeUpdate,
    db: Session = Depends(get_db),
    establishment_id: int = Depends(auth.require_permission("whatsapp.enviar")),
):
    if payload.modo not in ("bot", "human"):
        raise HTTPException(status_code=400, detail="Modo inválido.")
    conversation = db.query(models.WhatsAppConversation).filter(
        models.WhatsAppConversation.id == conversation_id,
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    conversation.atendimento_modo = payload.modo
    conversation.handoff_requested = payload.modo == "human"
    db.commit()
    return _serialize_conversation(conversation)


@router.post("/gateway/heartbeat", dependencies=[Depends(_gateway_auth)])
def gateway_heartbeat(payload: schemas.WhatsAppGatewayHeartbeat, db: Session = Depends(get_db)):
    establishment = _establishment(db, payload.slug)
    state = db.query(models.WhatsAppGatewayState).filter(
        models.WhatsAppGatewayState.estabelecimento_id == establishment.id,
    ).first()
    if not state:
        state = models.WhatsAppGatewayState(estabelecimento_id=establishment.id)
        db.add(state)
    state.connection = payload.connection
    state.connected_number = payload.connected_number
    state.automation_enabled = payload.automation_enabled
    state.needs_qr = payload.needs_qr
    state.error_message = payload.error_message
    state.last_seen_at = models.get_now()
    db.commit()
    return {"status": "ok"}


@router.post("/gateway/incoming", dependencies=[Depends(_gateway_auth)])
def gateway_incoming(payload: schemas.WhatsAppGatewayIncoming, db: Session = Depends(get_db)):
    establishment = _establishment(db, payload.slug)
    if payload.external_id:
        existing = db.query(models.WhatsAppChatMessage).filter(
            models.WhatsAppChatMessage.external_id == payload.external_id,
        ).first()
        if existing:
            return {"status": "duplicate", "conversation_id": existing.conversa_id}
    conversation = _conversation(db, establishment.id, payload.chat_id, payload.telefone, payload.contact_name)
    created_at = _local_naive(payload.criado_em)
    message = models.WhatsAppChatMessage(
        conversa_id=conversation.id,
        external_id=payload.external_id,
        direcao="in",
        remetente="cliente",
        texto=payload.texto,
        status="received",
        criado_em=created_at,
    )
    conversation.nao_lidas = (conversation.nao_lidas or 0) + 1
    conversation.ultima_mensagem = payload.texto
    conversation.ultima_interacao = created_at
    db.add(message)
    db.commit()
    return {"status": "created", "conversation_id": conversation.id, "mode": conversation.atendimento_modo}


@router.post("/gateway/outgoing", dependencies=[Depends(_gateway_auth)])
def gateway_outgoing(payload: schemas.WhatsAppGatewayOutgoing, db: Session = Depends(get_db)):
    establishment = _establishment(db, payload.slug)
    if payload.external_id:
        existing = db.query(models.WhatsAppChatMessage).filter(
            models.WhatsAppChatMessage.external_id == payload.external_id,
        ).first()
        if existing:
            return {"status": "duplicate", "conversation_id": existing.conversa_id}
    conversation = _conversation(db, establishment.id, payload.chat_id, payload.telefone, payload.contact_name)
    created_at = _local_naive(payload.criado_em)
    message = models.WhatsAppChatMessage(
        conversa_id=conversation.id,
        external_id=payload.external_id,
        direcao="out",
        remetente=payload.remetente if payload.remetente in ("bot", "humano") else "bot",
        texto=payload.texto,
        status="sent",
        criado_em=created_at,
        enviado_em=created_at,
    )
    conversation.ultima_mensagem = payload.texto
    conversation.ultima_interacao = created_at
    db.add(message)
    db.commit()
    return {"status": "created", "conversation_id": conversation.id}


@router.post("/gateway/mode", dependencies=[Depends(_gateway_auth)])
def gateway_mode(payload: schemas.WhatsAppGatewayMode, db: Session = Depends(get_db)):
    establishment = _establishment(db, payload.slug)
    conversation = _conversation(db, establishment.id, payload.chat_id)
    if payload.modo not in ("bot", "human"):
        raise HTTPException(status_code=400, detail="Modo inválido.")
    conversation.atendimento_modo = payload.modo
    conversation.handoff_requested = payload.handoff_requested
    db.commit()
    return {"status": "ok"}


@router.post("/gateway/contact", dependencies=[Depends(_gateway_auth)])
def gateway_contact(payload: schemas.WhatsAppGatewayContact, db: Session = Depends(get_db)):
    establishment = _establishment(db, payload.slug)
    conversation = _conversation(
        db,
        establishment.id,
        payload.chat_id,
        payload.telefone,
        payload.contact_name,
    )
    db.commit()
    return {"status": "ok", "conversation_id": conversation.id}


@router.get("/gateway/sync", dependencies=[Depends(_gateway_auth)])
def gateway_sync(slug: str, db: Session = Depends(get_db)):
    establishment = _establishment(db, slug)
    now = models.get_now()
    retry_before = now - datetime.timedelta(seconds=30)

    # 1. Mensagens manuais e urgentes (remetente != "campanha") - enviadas imediatamente
    manual_rows = db.query(
        models.WhatsAppChatMessage.id,
        models.WhatsAppChatMessage.texto,
        models.WhatsAppConversation.chat_id,
    ).join(
        models.WhatsAppConversation,
        models.WhatsAppConversation.id == models.WhatsAppChatMessage.conversa_id,
    ).filter(
        models.WhatsAppConversation.estabelecimento_id == establishment.id,
        models.WhatsAppChatMessage.remetente != "campanha",
        or_(
            models.WhatsAppChatMessage.status == "queued",
            (models.WhatsAppChatMessage.status == "dispatching") &
            (models.WhatsAppChatMessage.ultima_tentativa_em < retry_before),
        ),
    ).order_by(models.WhatsAppChatMessage.criado_em.asc()).limit(10).all()

    # 2. Mensagens de campanha: liberação controlada e pausada (máx 1 a cada 35 segundos)
    campaign_rows = []
    if not manual_rows:
        last_campaign_time = db.query(
            func.max(models.WhatsAppChatMessage.ultima_tentativa_em)
        ).join(
            models.WhatsAppConversation,
            models.WhatsAppConversation.id == models.WhatsAppChatMessage.conversa_id,
        ).filter(
            models.WhatsAppConversation.estabelecimento_id == establishment.id,
            models.WhatsAppChatMessage.remetente == "campanha",
            models.WhatsAppChatMessage.status.in_(("dispatching", "sent")),
        ).scalar()

        min_interval = datetime.timedelta(seconds=35)
        if last_campaign_time is None or (now - last_campaign_time) >= min_interval:
            campaign_rows = db.query(
                models.WhatsAppChatMessage.id,
                models.WhatsAppChatMessage.texto,
                models.WhatsAppConversation.chat_id,
            ).join(
                models.WhatsAppConversation,
                models.WhatsAppConversation.id == models.WhatsAppChatMessage.conversa_id,
            ).filter(
                models.WhatsAppConversation.estabelecimento_id == establishment.id,
                models.WhatsAppChatMessage.remetente == "campanha",
                or_(
                    models.WhatsAppChatMessage.status == "queued",
                    (models.WhatsAppChatMessage.status == "dispatching") &
                    (models.WhatsAppChatMessage.ultima_tentativa_em < retry_before),
                ),
            ).order_by(models.WhatsAppChatMessage.criado_em.asc()).limit(1).all()

    outbox_rows = manual_rows + campaign_rows

    outbox = []
    message_ids = []
    for r in outbox_rows:
        outbox.append({
            "id": r.id,
            "chat_id": r.chat_id,
            "texto": r.texto,
        })
        message_ids.append(r.id)

    if message_ids:
        db.query(models.WhatsAppChatMessage).filter(
            models.WhatsAppChatMessage.id.in_(message_ids)
        ).update(
            {
                models.WhatsAppChatMessage.status: "dispatching",
                models.WhatsAppChatMessage.ultima_tentativa_em: now,
            },
            synchronize_session=False,
        )
        db.commit()

    conversation_modes = db.query(
        models.WhatsAppConversation.chat_id,
        models.WhatsAppConversation.atendimento_modo,
    ).filter(
        models.WhatsAppConversation.estabelecimento_id == establishment.id,
    ).all()

    caixa_aberto = db.query(models.Caixa.id).filter(
        models.Caixa.estabelecimento_id == establishment.id,
        models.Caixa.status == "aberto",
    ).first() is not None

    return {
        "outbox": outbox,
        "modes": [
            {"chat_id": r.chat_id, "modo": r.atendimento_modo}
            for r in conversation_modes
        ],
        "caixa_aberto": caixa_aberto,
    }


@router.get("/campaigns/targets")
def get_campaign_targets(
    db: Session = Depends(get_db),
    establishment_id: int = Depends(auth.require_permission("whatsapp.visualizar")),
):
    import re
    # 1. Pega todos os pedidos com telefone do estabelecimento
    pedidos = db.query(
        models.Pedido.telefone,
        models.Pedido.cliente,
        models.Pedido.data,
        models.Pedido.total,
        models.Pedido.cliente_id,
    ).filter(
        models.Pedido.estabelecimento_id == establishment_id,
        models.Pedido.status != "Cancelado",
        models.Pedido.telefone.isnot(None),
        models.Pedido.telefone != "",
    ).order_by(models.Pedido.data.desc()).all()

    # 2. Pega clientes cadastrados
    clientes_db = db.query(models.Cliente).filter(
        models.Cliente.estabelecimento_id == establishment_id,
    ).all()
    clientes_by_phone = {}
    clientes_by_id = {}
    for c in clientes_db:
        clientes_by_id[c.id] = c
        if c.telefone:
            clean_p = re.sub(r"\D", "", c.telefone)
            if clean_p:
                clientes_by_phone[clean_p] = c

    # 3. Pega conversas existentes do WhatsApp para mapear chat_id exato
    conversas_db = db.query(
        models.WhatsAppConversation.chat_id,
        models.WhatsAppConversation.telefone,
    ).filter(
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
    ).all()
    chat_id_by_phone = {}
    for cv in conversas_db:
        if cv.telefone:
            clean_cv = re.sub(r"\D", "", cv.telefone)
            if clean_cv:
                chat_id_by_phone[clean_cv] = cv.chat_id
        if cv.chat_id and ("@c.us" in cv.chat_id or "@lid" in cv.chat_id):
            num = cv.chat_id.split("@")[0]
            chat_id_by_phone[num] = cv.chat_id

    # 4. Agrupa histórico por telefone
    agrupado = {}
    for p in pedidos:
        raw_tel = (p.telefone or "").strip()
        tel_digits = re.sub(r"\D", "", raw_tel)
        if not tel_digits or len(tel_digits) < 8:
            continue
        
        chave = tel_digits[-8:]
        if chave not in agrupado:
            agrupado[chave] = {
                "raw_tel": raw_tel,
                "tel_digits": tel_digits,
                "nome": p.cliente or "Cliente",
                "cliente_id": p.cliente_id,
                "ultimo_pedido": p.data,
                "total_gasto": 0.0,
                "total_pedidos": 0,
            }
        agrupado[chave]["total_gasto"] += float(p.total or 0.0)
        agrupado[chave]["total_pedidos"] += 1
        if p.data and p.data > agrupado[chave]["ultimo_pedido"]:
            agrupado[chave]["ultimo_pedido"] = p.data
        if p.cliente and agrupado[chave]["nome"] in ("Cliente", "Sem nome"):
            agrupado[chave]["nome"] = p.cliente

    # 5. Adiciona cadastrados sem pedidos
    for c in clientes_db:
        if not c.telefone:
            continue
        c_digits = re.sub(r"\D", "", c.telefone)
        if not c_digits or len(c_digits) < 8:
            continue
        chave = c_digits[-8:]
        if chave not in agrupado:
            agrupado[chave] = {
                "raw_tel": c.telefone,
                "tel_digits": c_digits,
                "nome": c.nome or "Cliente",
                "cliente_id": c.id,
                "ultimo_pedido": c.data_cadastro,
                "total_gasto": 0.0,
                "total_pedidos": 0,
            }

    agora = models.get_now()
    clientes_resultado = []
    counts = {
        "total": 0,
        "cashback": 0,
        "inactive_15": 0,
        "inactive_30": 0,
        "vip_sumido": 0,
    }

    for chave, item in agrupado.items():
        c_obj = None
        if item["cliente_id"] and item["cliente_id"] in clientes_by_id:
            c_obj = clientes_by_id[item["cliente_id"]]
        elif item["tel_digits"] in clientes_by_phone:
            c_obj = clientes_by_phone[item["tel_digits"]]
        
        saldo_cashback = round(float(c_obj.saldo_cashback), 2) if (c_obj and c_obj.saldo_cashback) else 0.0
        nome_final = (c_obj.nome if c_obj and c_obj.nome else item["nome"]).strip()
        primeiro_nome = nome_final.split()[0].title() if nome_final else "Cliente"

        if item["ultimo_pedido"]:
            delta = agora.date() - item["ultimo_pedido"].date()
            dias_ausente = max(0, delta.days)
        else:
            dias_ausente = 0

        full_digits = item["tel_digits"]
        if not full_digits.startswith("55") and len(full_digits) in (10, 11):
            full_digits = "55" + full_digits
        chat_id = chat_id_by_phone.get(full_digits) or chat_id_by_phone.get(item["tel_digits"]) or f"{full_digits}@c.us"

        tags = []
        if saldo_cashback > 0:
            tags.append("cashback")
            counts["cashback"] += 1
        if dias_ausente >= 15:
            tags.append("inactive_15")
            counts["inactive_15"] += 1
        if dias_ausente >= 30:
            tags.append("inactive_30")
            counts["inactive_30"] += 1
        if item["total_pedidos"] >= 3 and dias_ausente >= 20:
            tags.append("vip_sumido")
            counts["vip_sumido"] += 1

        counts["total"] += 1

        clientes_resultado.append({
            "nome": nome_final,
            "primeiro_nome": primeiro_nome,
            "telefone": item["raw_tel"],
            "telefone_limpo": full_digits,
            "chat_id": chat_id,
            "saldo_cashback": saldo_cashback,
            "total_pedidos": item["total_pedidos"],
            "total_gasto": round(item["total_gasto"], 2),
            "ultimo_pedido": item["ultimo_pedido"].isoformat() if item["ultimo_pedido"] else None,
            "dias_ausente": dias_ausente,
            "tags": tags,
        })

    pending_campaign = db.query(models.WhatsAppChatMessage).join(
        models.WhatsAppConversation,
        models.WhatsAppConversation.id == models.WhatsAppChatMessage.conversa_id,
    ).filter(
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
        models.WhatsAppChatMessage.remetente == "campanha",
        models.WhatsAppChatMessage.status.in_(("queued", "dispatching")),
    ).count()

    sent_today = db.query(models.WhatsAppChatMessage).join(
        models.WhatsAppConversation,
        models.WhatsAppConversation.id == models.WhatsAppChatMessage.conversa_id,
    ).filter(
        models.WhatsAppConversation.estabelecimento_id == establishment_id,
        models.WhatsAppChatMessage.remetente == "campanha",
        models.WhatsAppChatMessage.status == "sent",
        models.WhatsAppChatMessage.criado_em >= agora.replace(hour=0, minute=0, second=0),
    ).count()

    return {
        "counts": counts,
        "queue_status": {
            "pending_count": pending_campaign,
            "sent_today": sent_today,
            "intervalo_segundos": 35,
        },
        "clients": sorted(clientes_resultado, key=lambda x: (x["dias_ausente"], -x["saldo_cashback"]), reverse=True),
    }


@router.post("/campaigns/send")
def send_campaign_batch(
    payload: schemas.WhatsAppCampaignSendRequest,
    db: Session = Depends(get_db),
    establishment_id: int = Depends(auth.require_permission("whatsapp.enviar")),
):
    if not payload.targets:
        raise HTTPException(status_code=400, detail="Nenhum destinatário informado.")
    if len(payload.targets) > 50:
        raise HTTPException(status_code=400, detail="Por segurança, o limite máximo por lote é de 50 mensagens.")

    now = models.get_now()
    queued_count = 0

    for target in payload.targets:
        text = (target.texto or "").strip()
        if not text:
            continue
        
        chat_id = target.chat_id
        if not chat_id:
            tel = "".join(filter(str.isdigit, target.telefone or ""))
            if not tel.startswith("55") and len(tel) in (10, 11):
                tel = "55" + tel
            chat_id = f"{tel}@c.us"

        conv = _conversation(db, establishment_id, chat_id, target.telefone, target.nome)
        
        msg = models.WhatsAppChatMessage(
            conversa_id=conv.id,
            direcao="out",
            remetente="campanha",
            texto=text,
            status="queued",
            criado_em=now,
        )
        conv.ultima_mensagem = text
        conv.ultima_interacao = now
        db.add(msg)
        queued_count += 1

    db.commit()
    return {"status": "ok", "queued_count": queued_count}


@router.post("/campaigns/cancel")
def cancel_campaign_queue(
    db: Session = Depends(get_db),
    establishment_id: int = Depends(auth.require_permission("whatsapp.enviar")),
):
    deleted = db.query(models.WhatsAppChatMessage).filter(
        models.WhatsAppChatMessage.conversa_id.in_(
            db.query(models.WhatsAppConversation.id).filter(
                models.WhatsAppConversation.estabelecimento_id == establishment_id
            )
        ),
        models.WhatsAppChatMessage.remetente == "campanha",
        models.WhatsAppChatMessage.status == "queued",
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "ok", "cancelled_count": deleted}


@router.post("/gateway/outbox/{message_id}/status", dependencies=[Depends(_gateway_auth)])
def gateway_delivery_status(
    message_id: int,
    payload: schemas.WhatsAppGatewayDeliveryStatus,
    db: Session = Depends(get_db),
):
    message = db.query(models.WhatsAppChatMessage).filter(models.WhatsAppChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada.")
    if payload.status not in ("sent", "failed"):
        raise HTTPException(status_code=400, detail="Status inválido.")
    message.status = payload.status
    message.external_id = payload.external_id or message.external_id
    message.erro = payload.error_message
    if payload.status == "sent":
        message.enviado_em = models.get_now()
    db.commit()
    return {"status": "ok"}
