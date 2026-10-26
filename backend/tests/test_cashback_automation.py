import os
import sys
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models, crud, schemas

class CashbackAutomationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        models.Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        self.est = models.Estabelecimento(nome="BisBurger Test", slug="bisburger-test", email="teste@bisburger.com")
        self.db.add(self.est)
        self.db.commit()
        crud.abrir_caixa(self.db, schemas.CaixaCreate(operador="Caixa", saldo_inicial=0), self.est.id)
        self.prod = crud.create_produto(self.db, schemas.ProdutoCreate(nome="Burger", preco=40.0, categoria="Burgers"), self.est.id)

    def tearDown(self):
        self.db.close()

    def test_phone_normalization(self):
        self.assertEqual(crud.normalizar_telefone("5582998218008"), "82998218008")
        self.assertEqual(crud.normalizar_telefone("+55 (82) 99821-8008"), "82998218008")
        self.assertEqual(crud.normalizar_telefone("(82) 99821-8008"), "82998218008")
        self.assertEqual(crud.normalizar_telefone("82998218008"), "82998218008")
        self.assertEqual(crud.normalizar_telefone("558232810000"), "8232810000")

    def test_whatsapp_order_links_to_authenticated_account_and_awards_cashback_on_finalize(self):
        # 1. Customer account created on web (82998218008)
        c_web = models.Cliente(estabelecimento_id=self.est.id, nome="Luciano", telefone="82998218008", google_id="g_123", saldo_cashback=0.0)
        self.db.add(c_web)
        self.db.commit()

        # 2. WhatsApp order created with 5582998218008
        order = crud.create_pedido(self.db, schemas.PedidoCreate(
            cliente="Luciano WA",
            telefone="5582998218008",
            tipo_entrega="Delivery",
            forma_pagamento="PIX",
            itens=[schemas.ItemPedidoCreate(produto_id=self.prod.id, quantidade=1)]
        ), self.est.id)

        self.assertEqual(order.cliente_id, c_web.id)
        self.assertEqual(order.status, "Recebido")
        self.assertIsNone(order.pagamento_confirmado_em)
        self.assertEqual(c_web.saldo_cashback, 0.0)

        # 3. Order is moved to Finalizado (e.g. from Kanban)
        crud.update_pedido_status(self.db, order.id, "Finalizado", self.est.id)
        self.db.refresh(order)
        self.db.refresh(c_web)

        # 40 total + 5 delivery = 45 -> 2% = 0.90 cashback
        self.assertIsNotNone(order.pagamento_confirmado_em)
        self.assertAlmostEqual(c_web.saldo_cashback, 0.90)

    def test_retroactive_recovery_heals_unconfirmed_completed_orders(self):
        c = models.Cliente(estabelecimento_id=self.est.id, nome="Ana", telefone="5582999991111", saldo_cashback=0.0)
        self.db.add(c)
        self.db.commit()

        # Order finalized before fix without payment confirmed
        past_order = models.Pedido(
            estabelecimento_id=self.est.id,
            numero="1-20261026-099",
            cliente="Ana",
            telefone="5582999991111",
            tipo_entrega="Retirada",
            forma_pagamento="PIX",
            total=100.0,
            status="Finalizado",
            cliente_id=c.id,
            pagamento_confirmado_em=None
        )
        self.db.add(past_order)
        self.db.commit()

        # Run startup recovery
        crud.recuperar_cashback_pedidos_concluidos(self.db)
        self.db.refresh(c)
        self.db.refresh(past_order)

        self.assertEqual(c.telefone, "82999991111")
        self.assertIsNotNone(past_order.pagamento_confirmado_em)
        self.assertAlmostEqual(c.saldo_cashback, 2.00)

    def test_cancellation_reverses_reward_and_refunds_spent_cashback(self):
        c = models.Cliente(estabelecimento_id=self.est.id, nome="Carlos", telefone="82988887777", saldo_cashback=10.0)
        self.db.add(c)
        self.db.commit()

        # Place order using 5.00 cashback
        order = crud.create_pedido(self.db, schemas.PedidoCreate(
            cliente="Carlos",
            telefone="82988887777",
            tipo_entrega="Retirada",
            forma_pagamento="Dinheiro",
            cashback_usado=5.0,
            itens=[schemas.ItemPedidoCreate(produto_id=self.prod.id, quantidade=1)]
        ), self.est.id)
        self.db.refresh(c)
        self.assertAlmostEqual(c.saldo_cashback, 5.0) # 10 - 5

        # Finalize order -> awards 2% of 35 = 0.70
        crud.update_pedido_status(self.db, order.id, "Finalizado", self.est.id)
        self.db.refresh(c)
        self.assertAlmostEqual(c.saldo_cashback, 5.70)

        # Now cancel order -> should revert 0.70 reward and refund 5.00 used cashback
        crud.cancelar_pedido(self.db, order.id, "Cliente cancelou", False, self.est.id)
        self.db.refresh(c)
        self.assertAlmostEqual(c.saldo_cashback, 10.0)
