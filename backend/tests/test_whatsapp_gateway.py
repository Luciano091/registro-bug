import os
import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["WHATSAPP_GATEWAY_TOKEN"] = "test-gateway-secret"

import models
import schemas
import whatsapp_gateway


class WhatsAppGatewayTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.Session = sessionmaker(bind=self.engine)
        models.Base.metadata.create_all(self.engine)
        self.db = self.Session()
        establishment = models.Estabelecimento(
            nome="BisBurger",
            slug="bisburger",
            status="ativo",
        )
        self.db.add(establishment)
        self.db.commit()
        self.establishment_id = establishment.id

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_full_message_roundtrip(self):
        whatsapp_gateway.gateway_heartbeat(
            schemas.WhatsAppGatewayHeartbeat(
                slug="bisburger",
                connection="ready",
                connected_number="558200000000",
                automation_enabled=True,
                needs_qr=False,
            ),
            self.db,
        )
        whatsapp_gateway.gateway_incoming(
            schemas.WhatsAppGatewayIncoming(
                slug="bisburger",
                chat_id="123@lid",
                contact_name="Cliente",
                external_id="wa-in-1",
                texto="Quero falar com atendente",
            ),
            self.db,
        )

        inbox = whatsapp_gateway.inbox(self.db, self.establishment_id)
        conversation = inbox["conversations"][0]
        self.assertEqual(conversation["nao_lidas"], 1)
        self.assertTrue(inbox["gateway"]["online"])
        summary = whatsapp_gateway.inbox_summary(self.db, self.establishment_id)
        incoming = self.db.query(models.WhatsAppChatMessage).filter(
            models.WhatsAppChatMessage.direcao == "in",
        ).one()
        self.assertEqual(summary["latest_incoming_id"], incoming.id)

        whatsapp_gateway.gateway_mode(
            schemas.WhatsAppGatewayMode(
                slug="bisburger",
                chat_id="123@lid",
                modo="human",
                handoff_requested=True,
            ),
            self.db,
        )
        whatsapp_gateway.gateway_contact(
            schemas.WhatsAppGatewayContact(
                slug="bisburger",
                chat_id="123@lid",
                telefone="5582999999999",
                contact_name="Cliente Atualizado",
            ),
            self.db,
        )
        queued = whatsapp_gateway.queue_manual_message(
            conversation["id"],
            schemas.WhatsAppManualMessageCreate(texto="Olá, vou continuar seu atendimento."),
            self.db,
            self.establishment_id,
        )

        sync = whatsapp_gateway.gateway_sync("bisburger", self.db)
        self.assertEqual(sync["outbox"][0]["id"], queued["id"])
        self.assertEqual(sync["modes"][0]["modo"], "human")

        whatsapp_gateway.gateway_delivery_status(
            queued["id"],
            schemas.WhatsAppGatewayDeliveryStatus(status="sent", external_id="wa-out-1"),
            self.db,
        )
        detail = whatsapp_gateway.conversation_detail(
            conversation["id"], self.db, self.establishment_id,
        )
        self.assertEqual(detail["telefone"], "5582999999999")
        self.assertEqual(detail["nome"], "Cliente Atualizado")
        self.assertEqual([item["status"] for item in detail["mensagens"]], ["received", "sent"])

    def test_gateway_rejects_invalid_secret(self):
        with self.assertRaises(HTTPException) as context:
            whatsapp_gateway._gateway_auth("wrong")
        self.assertEqual(context.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
