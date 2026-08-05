import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
import whatsapp_api

DEFAULT_DB_URL = "postgresql://neondb_owner:npg_PJaA6coCD2QY@ep-little-tree-ac1havuv-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DEFAULT_DB_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

payload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123",
      "changes": [
        {
          "field": "messages",
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "123",
              "phone_number_id": "123"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Cliente Simulado API"
                },
                "wa_id": "5511999999999"
              }
            ],
            "messages": [
              {
                "from": "5511999999999",
                "id": f"wamid.test_local",
                "timestamp": "1722800000",
                "type": "text",
                "text": {
                  "body": "Teste local de webhook"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}

async def run():
    try:
        await whatsapp_api.process_webhook(payload, db)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(run())

db.close()
