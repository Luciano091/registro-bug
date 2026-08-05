import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
import whatsapp_api
import datetime

DEFAULT_DB_URL = "postgresql://neondb_owner:npg_PJaA6coCD2QY@ep-little-tree-ac1havuv-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DEFAULT_DB_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Set last interaction to 3 hours ago
contato = db.query(models.WhatsAppContato).filter(models.WhatsAppContato.telefone == "5511999999999").first()
if contato:
    contato.ultima_interacao = models.get_now() - datetime.timedelta(hours=3)
    db.commit()

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
                "id": f"wamid.test_force",
                "timestamp": "1722800000",
                "type": "text",
                "text": {
                  "body": "Oi, vim testar de novo."
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
    print("Running webhook...")
    try:
        await whatsapp_api.process_webhook(payload, db)
        print("Done!")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(run())
db.close()
