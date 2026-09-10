import os
import sys
import tempfile
import unittest
import datetime
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

    def test_required_options_are_validated_and_snapshotted(self):
        establishment = self.create_establishment("Hamburgueria", "catalogo", "catalogo@teste.com")
        product = crud.create_produto(self.db, schemas.ProdutoCreate(nome="X-Burger", categoria="Lanches", preco=20), establishment.id)
        group = crud.save_grupo_opcao(
            self.db,
            schemas.GrupoOpcaoCreate(
                nome="Tamanho", minimo=1, maximo=1, obrigatorio=True,
                opcoes=[
                    schemas.OpcaoProdutoCreate(nome="Normal", preco_adicional=0),
                    schemas.OpcaoProdutoCreate(nome="Grande", preco_adicional=5),
                ],
            ),
            establishment.id,
        )
        crud.set_produto_grupos(self.db, product.id, [group.id], establishment.id)
        base = dict(cliente="Cliente", telefone="82999999999", tipo_entrega="Retirada", forma_pagamento="Pix")
        with self.assertRaisesRegex(ValueError, "Tamanho"):
            crud.create_pedido(
                self.db,
                schemas.PedidoCreate(**base, itens=[schemas.ItemPedidoCreate(produto_id=product.id, quantidade=1)]),
                establishment.id,
            )
        order = crud.create_pedido(
            self.db,
            schemas.PedidoCreate(**base, itens=[schemas.ItemPedidoCreate(
                produto_id=product.id, quantidade=2, observacao="Sem cebola",
                opcoes=[schemas.ItemPedidoOpcaoCreate(opcao_id=group.opcoes[1].id)],
            )]),
            establishment.id,
        )
        self.assertEqual(order.total, 50)
        self.assertEqual(order.itens[0].produto_nome, "X-Burger")
        self.assertEqual(order.itens[0].observacao, "Sem cebola")
        self.assertEqual(order.itens[0].opcoes[0].opcao_nome, "Grande")
        group.opcoes[1].nome = "Gigante"
        product.nome = "X-Burger Novo"
        self.db.commit()
        self.db.refresh(order)
        self.assertEqual(order.itens[0].produto_nome, "X-Burger")
        self.assertEqual(order.itens[0].opcoes[0].opcao_nome, "Grande")

    def test_categories_and_availability_are_tenant_scoped(self):
        first = self.create_establishment("Unidade A", "agenda-a", "agenda-a@teste.com")
        second = self.create_establishment("Unidade B", "agenda-b", "agenda-b@teste.com")
        category = crud.save_categoria(self.db, schemas.CategoriaCreate(nome="Almoço", ordem=1), first.id)
        product = crud.create_produto(self.db, schemas.ProdutoCreate(nome="Executivo", categoria="Almoço", categoria_id=category.id, preco=30), first.id)
        self.assertEqual(product.categoria_id, category.id)
        self.assertEqual([item.nome for item in crud.get_categorias(self.db, first.id)], ["Almoço"])
        self.assertEqual(crud.get_categorias(self.db, second.id), [])
        with self.assertRaisesRegex(ValueError, "Categoria inválida"):
            crud.create_produto(self.db, schemas.ProdutoCreate(nome="Invasor", categoria="Almoço", categoria_id=category.id, preco=30), second.id)
        monday_lunch = datetime.datetime(2026, 9, 7, 12, 0)
        monday_evening = datetime.datetime(2026, 9, 7, 19, 0)
        self.assertTrue(crud.dentro_do_horario("0", "11:00", "14:00", monday_lunch))
        self.assertFalse(crud.dentro_do_horario("0", "11:00", "14:00", monday_evening))
        tuesday_after_midnight = datetime.datetime(2026, 9, 8, 1, 0)
        self.assertTrue(crud.dentro_do_horario("0", "18:00", "02:00", tuesday_after_midnight))

    def test_scheduled_promotions_and_coupons_are_calculated_on_server(self):
        establishment = self.create_establishment("Pizzaria", "ofertas", "ofertas@teste.com")
        now = models.get_now()
        product = crud.create_produto(self.db, schemas.ProdutoCreate(
            nome="Pizza", categoria="Pizzas", preco=50, is_promocao=True, preco_promocao=40,
            promocao_inicio=now - datetime.timedelta(minutes=5), promocao_fim=now + datetime.timedelta(minutes=5),
        ), establishment.id)
        coupon = crud.save_cupom(self.db, schemas.CupomCreate(codigo="BEMVINDO", tipo="percentual", valor=10, pedido_minimo=20), establishment.id)
        order = crud.create_pedido(self.db, schemas.PedidoCreate(
            cliente="Cliente", telefone="82999999999", tipo_entrega="Retirada", forma_pagamento="Pix",
            cupom_codigo="bemvindo", itens=[schemas.ItemPedidoCreate(produto_id=product.id, quantidade=1)],
        ), establishment.id)
        self.assertEqual(order.subtotal, 40)
        self.assertEqual(order.desconto, 4)
        self.assertEqual(order.total, 36)
        self.db.refresh(coupon)
        self.assertEqual(coupon.usos, 1)
        other = self.create_establishment("Outra Loja", "outra-oferta", "outra@teste.com")
        with self.assertRaisesRegex(ValueError, "inválido"):
            crud.validar_cupom(self.db, "BEMVINDO", 100, other.id)


if __name__ == "__main__":
    unittest.main()
