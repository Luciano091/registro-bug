import datetime
import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import or_
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
    messages = db.query(models.WhatsAppChatMessage).join(models.WhatsAppConversation).filter(
        models.WhatsAppConversation.estabelecimento_id == establishment.id,
        or_(
            models.WhatsAppChatMessage.status == "queued",
            (models.WhatsAppChatMessage.status == "dispatching") &
            (models.WhatsAppChatMessage.ultima_tentativa_em < retry_before),
        ),
    ).order_by(models.WhatsAppChatMessage.criado_em.asc()).limit(20).all()
    for message in messages:
        message.status = "dispatching"
        message.ultima_tentativa_em = now
    conversations = db.query(models.WhatsAppConversation).filter(
        models.WhatsAppConversation.estabelecimento_id == establishment.id,
    ).all()
    db.commit()
    return {
        "outbox": [
            {
                "id": message.id,
                "chat_id": message.conversa.chat_id,
                "texto": message.texto,
            }
            for message in messages
        ],
        "modes": [
            {"chat_id": item.chat_id, "modo": item.atendimento_modo}
            for item in conversations
        ],
    }


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
