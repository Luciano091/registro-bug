import json
import logging
import os
import threading
from typing import Iterable

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

logger = logging.getLogger(__name__)
FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
_lock = threading.Lock()
_credentials = None
_project_id = None

def _configuration():
    global _credentials, _project_id
    with _lock:
        if _credentials and _project_id:
            return _credentials, _project_id
        raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
        if not raw:
            return None, None
        try:
            info = json.loads(raw)
            _credentials = service_account.Credentials.from_service_account_info(info, scopes=[FCM_SCOPE])
            _project_id = os.getenv("FIREBASE_PROJECT_ID") or info.get("project_id")
        except Exception:
            logger.exception("Não foi possível carregar as credenciais do Firebase.")
            return None, None
        return _credentials, _project_id

def _access_token(credentials):
    with _lock:
        if not credentials.valid or credentials.expired:
            credentials.refresh(Request())
        return credentials.token

def _disable_invalid_tokens(tokens: list[str]):
    if not tokens:
        return
    try:
        from database import SessionLocal
        import models
        with SessionLocal() as db:
            db.query(models.DispositivoPush).filter(models.DispositivoPush.token.in_(tokens)).update(
                {models.DispositivoPush.ativo: False}, synchronize_session=False,
            )
            db.commit()
    except Exception:
        logger.exception("Não foi possível desativar tokens FCM inválidos.")

def send_push_notifications(tokens: Iterable[str], title: str, body: str, data: dict | None = None):
    unique_tokens = list(dict.fromkeys(token for token in tokens if token))
    if not unique_tokens:
        logger.info("Push não enviado: nenhum dispositivo ativo foi encontrado.")
        return {"sent": 0, "failed": 0, "configured": True}
    credentials, project_id = _configuration()
    if not credentials or not project_id:
        logger.warning("Push ignorado: FIREBASE_SERVICE_ACCOUNT_JSON não configurado.")
        return {"sent": 0, "failed": len(unique_tokens), "configured": False}
    try:
        access_token = _access_token(credentials)
    except Exception:
        logger.exception("Não foi possível autenticar o envio FCM.")
        return {"sent": 0, "failed": len(unique_tokens), "configured": True}

    endpoint = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json; charset=utf-8"}
    message_data = {str(key): str(value) for key, value in (data or {}).items()}
    sent = 0
    invalid_tokens = []
    for token in unique_tokens:
        payload = {
            "message": {
                "token": token,
                "notification": {"title": title, "body": body},
                "data": message_data,
                "android": {
                    "priority": "high",
                    "notification": {
                        "channel_id": "ritmesa_delivery_alerts",
                        "sound": "default",
                        "default_vibrate_timings": True,
                        "click_action": "OPEN_DELIVERIES",
                    },
                },
            }
        }
        try:
            response = requests.post(endpoint, headers=headers, json=payload, timeout=15)
            if response.ok:
                sent += 1
                continue
            error_status = (response.json().get("error") or {}).get("status", "")
            if response.status_code == 404 or error_status == "UNREGISTERED":
                invalid_tokens.append(token)
            logger.warning("FCM recusou uma notificação (%s): %s", response.status_code, error_status)
        except Exception:
            logger.exception("Falha de rede ao enviar uma notificação FCM.")
    _disable_invalid_tokens(invalid_tokens)
    result = {"sent": sent, "failed": len(unique_tokens) - sent, "configured": True}
    logger.info("Resultado do envio push: destinatarios=%s enviados=%s falhas=%s", len(unique_tokens), result["sent"], result["failed"])
    return result
