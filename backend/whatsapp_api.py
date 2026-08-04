import os
import httpx
from sqlalchemy.orm import Session
import models
import schemas

META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "TEST_TOKEN")
META_PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "TEST_PHONE_ID")
META_VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN", "burger_hause_secret_token")
META_API_URL = "https://graph.facebook.com/v19.0"

def get_or_create_contact(db: Session, telefone: str, nome: str = None):
    contato = db.query(models.WhatsAppContato).filter(models.WhatsAppContato.telefone == telefone).first()
    if not contato:
        contato = models.WhatsAppContato(telefone=telefone, nome=nome)
        db.add(contato)
        db.commit()
        db.refresh(contato)
    return contato

async def send_whatsapp_message(telefone: str, texto: str, db: Session = None):
    # Format phone number for WhatsApp API (needs to include country code, e.g. 55)
    phone = "".join(filter(str.isdigit, telefone))
    if not phone.startswith("55"):
        phone = "55" + phone

    if META_ACCESS_TOKEN == "TEST_TOKEN":
        print(f"[TEST MODE] Simulating sending WhatsApp to {phone}: {texto}")
        if db:
            contato = get_or_create_contact(db, phone)
            msg = models.WhatsAppMensagem(
                contato_id=contato.id,
                direcao="out",
                texto=texto,
                status="sent",
                meta_message_id=f"test_id_{models.get_now().timestamp()}"
            )
            db.add(msg)
            db.commit()
        return {"status": "success", "mode": "test"}

    url = f"{META_API_URL}/{META_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {META_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": texto}
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        
        if response.status_code in [200, 201]:
            data = response.json()
            message_id = data.get("messages", [{}])[0].get("id")
            if db:
                contato = get_or_create_contact(db, phone)
                msg = models.WhatsAppMensagem(
                    contato_id=contato.id,
                    direcao="out",
                    texto=texto,
                    status="sent",
                    meta_message_id=message_id
                )
                db.add(msg)
                db.commit()
            return {"status": "success", "data": data}
        else:
            print(f"Error sending WhatsApp: {response.text}")
            return {"status": "error", "data": response.text}

async def process_webhook(payload: dict, db: Session):
    # Trata eventos recebidos pelo Webhook
    try:
        entries = payload.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                
                # Check if it's a message
                if "messages" in value:
                    for msg in value["messages"]:
                        contact_info = value.get("contacts", [{}])[0]
                        phone = msg.get("from")
                        name = contact_info.get("profile", {}).get("name")
                        meta_msg_id = msg.get("id")
                        
                        if msg.get("type") == "text":
                            text = msg.get("text", {}).get("body")
                            
                            # Save in DB
                            contato = get_or_create_contact(db, phone, name)
                            
                            # Check if message already exists (webhooks can be duplicated)
                            existing = db.query(models.WhatsAppMensagem).filter(models.WhatsAppMensagem.meta_message_id == meta_msg_id).first()
                            if not existing:
                                db_msg = models.WhatsAppMensagem(
                                    contato_id=contato.id,
                                    direcao="in",
                                    texto=text,
                                    status="received",
                                    meta_message_id=meta_msg_id
                                )
                                db.add(db_msg)
                                contato.ultima_interacao = models.get_now()
                                db.commit()
                                
                                # Bot Auto-reply logic
                                await send_whatsapp_message(
                                    phone,
                                    "Olá! Sou o assistente virtual da Burger Hause. Nosso cardápio digital é: https://burgerhause.com. Para falar com um atendente, aguarde um momento.",
                                    db
                                )
                                
                # Check for status updates (sent, delivered, read)
                if "statuses" in value:
                    for status_update in value["statuses"]:
                        meta_msg_id = status_update.get("id")
                        status = status_update.get("status") # sent, delivered, read, failed
                        
                        existing = db.query(models.WhatsAppMensagem).filter(models.WhatsAppMensagem.meta_message_id == meta_msg_id).first()
                        if existing:
                            existing.status = status
                            db.commit()
                            
    except Exception as e:
        print(f"Error processing webhook: {e}")
