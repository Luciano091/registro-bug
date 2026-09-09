import os
import sys
import tempfile
import unittest
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

import auth
import crud
import models
import schemas


class FoundationTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.engine = create_engine(f"sqlite:///{Path(self.tempdir.name) / 'test.db'}")
        models.Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        self.tempdir.cleanup()

    def create_establishment(self, name: str, slug: str, email: str):
        return crud.create_estabelecimento(
            self.db,
            schemas.EstabelecimentoCreate(
                nome=name, slug=slug, email=email, senha_inicial="senha-forte",
                plano="Essencial", status="trial",
            ),
        )

    def test_owner_is_created_with_new_establishment(self):
        establishment = self.create_establishment("Restaurante Um", "restaurante-um", "dono@teste.com")
        owner = crud.get_usuario_by_email(self.db, "DONO@TESTE.COM", establishment.id)
        self.assertIsNotNone(owner)
        self.assertEqual(owner.perfil, "proprietario")
        self.assertTrue(auth.verify_password("senha-forte", owner.senha_hash))

    def test_same_staff_email_is_isolated_by_establishment(self):
        first = self.create_establishment("Unidade A", "unidade-a", "a@teste.com")
        second = self.create_establishment("Unidade B", "unidade-b", "b@teste.com")
        payload = schemas.UsuarioCreate(nome="Operador", email="operador@teste.com", senha="12345678", perfil="caixa")
        first_user = crud.create_usuario(self.db, payload, first.id)
        second_user = crud.create_usuario(self.db, payload, second.id)
        self.assertNotEqual(first_user.id, second_user.id)
        self.assertEqual(crud.get_usuario_by_email(self.db, payload.email, first.id).estabelecimento_id, first.id)
        self.assertEqual(crud.get_usuario_by_email(self.db, payload.email, second.id).estabelecimento_id, second.id)

    def test_profile_permissions_do_not_leak_management_access(self):
        self.assertIn("usuarios.gerenciar", auth.PERMISSOES_POR_PERFIL["gerente"])
        self.assertNotIn("usuarios.gerenciar", auth.PERMISSOES_POR_PERFIL["caixa"])
        self.assertNotIn("caixa.operar", auth.PERMISSOES_POR_PERFIL["garcom"])
        self.assertEqual(auth.PERMISSOES_POR_PERFIL["proprietario"], {"*"})

    def test_public_order_token_is_not_sequential_and_is_tenant_scoped(self):
        first = self.create_establishment("Unidade A", "token-a", "token-a@teste.com")
        second = self.create_establishment("Unidade B", "token-b", "token-b@teste.com")
        product = crud.create_produto(
            self.db,
            schemas.ProdutoCreate(nome="Produto", categoria="Teste", preco=10),
            first.id,
        )
        order = crud.create_pedido(
            self.db,
            schemas.PedidoCreate(
                cliente="Cliente", telefone="82999999999", tipo_entrega="Retirada",
                forma_pagamento="Pix", itens=[schemas.ItemPedidoCreate(produto_id=product.id, quantidade=1)],
            ),
            first.id,
        )
        self.assertGreaterEqual(len(order.uuid), 32)
        self.assertEqual(crud.get_pedido_by_public_token(self.db, order.uuid, first.id).id, order.id)
        self.assertIsNone(crud.get_pedido_by_public_token(self.db, order.uuid, second.id))


if __name__ == "__main__":
    unittest.main()
