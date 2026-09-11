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

    def test_legacy_bootstrap_does_not_create_or_reuse_another_tenant(self):
        establishment = self.create_establishment("Restaurante Novo", "restaurante-novo", "novo@teste.com")
        config_id = establishment.configuracao_id
        result = crud.ensure_initial_establishment(self.db)
        self.assertEqual(result.id, establishment.id)
        self.assertEqual(self.db.query(models.Estabelecimento).count(), 1)
        self.assertEqual(establishment.configuracao_id, config_id)

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
        self.assertNotIn("pedidos.visualizar", auth.PERMISSOES_POR_PERFIL["entregador"])
        self.assertNotIn("configuracoes.visualizar", auth.PERMISSOES_POR_PERFIL["entregador"])
        self.assertEqual(auth.PERMISSOES_POR_PERFIL["proprietario"], {"*"})

    def test_combo_deducts_linked_stock_and_cancellation_restores_it_once(self):
        establishment = self.create_establishment("Combo", "combo", "combo@teste.com")
        other = self.create_establishment("Outro Combo", "outro-combo", "outro-combo@teste.com")
        drink = crud.create_produto(self.db, schemas.ProdutoCreate(nome="Refrigerante", categoria="Bebidas", preco=6, controlar_estoque=True, estoque=10), establishment.id)
        foreign = crud.create_produto(self.db, schemas.ProdutoCreate(nome="Produto externo", categoria="Teste", preco=1), other.id)
        with self.assertRaisesRegex(ValueError, "não pertence"):
            crud.save_grupo_opcao(self.db, schemas.GrupoOpcaoCreate(nome="Inválido", opcoes=[schemas.OpcaoProdutoCreate(nome="Externo", produto_vinculado_id=foreign.id)]), establishment.id)
        combo = crud.create_produto(self.db, schemas.ProdutoCreate(nome="Combo almoço", categoria="Combos", preco=25, is_combo=True), establishment.id)
        group = crud.save_grupo_opcao(self.db, schemas.GrupoOpcaoCreate(
            nome="Bebida", minimo=1, maximo=1, obrigatorio=True,
            opcoes=[schemas.OpcaoProdutoCreate(nome="Refrigerante", produto_vinculado_id=drink.id)],
        ), establishment.id)
        crud.set_produto_grupos(self.db, combo.id, [group.id], establishment.id)
        order = crud.create_pedido(self.db, schemas.PedidoCreate(
            cliente="Ana", telefone="", tipo_entrega="Retirada", forma_pagamento="PIX",
            itens=[schemas.ItemPedidoCreate(produto_id=combo.id, quantidade=2, opcoes=[schemas.ItemPedidoOpcaoCreate(opcao_id=group.opcoes[0].id)])],
        ), establishment.id)
        self.db.refresh(drink)
        self.assertEqual(drink.estoque, 8)
        self.assertEqual(order.itens[0].opcoes[0].produto_vinculado_id, drink.id)
        cash = crud.abrir_caixa(self.db, schemas.CaixaCreate(operador="Caixa", saldo_inicial=0), establishment.id)
        crud.add_movimentacao(self.db, cash.id, schemas.MovimentacaoCaixaCreate(tipo="venda", valor=order.total, forma_pagamento="PIX", descricao=f"Pedido #{order.numero}"))
        crud.cancelar_pedido(self.db, order.id, "Cliente desistiu", True, establishment.id)
        self.db.refresh(drink)
        self.assertEqual(drink.estoque, 10)
        self.assertEqual([item.tipo for item in cash.movimentacoes].count("estorno"), 1)
        day_start = datetime.datetime.combine(order.data.date(), datetime.time.min)
        day_end = datetime.datetime.combine(order.data.date(), datetime.time.max)
        self.assertNotIn(order, crud.get_pedidos_by_date_range(self.db, day_start, day_end, establishment.id))
        self.assertIn(order, crud.get_pedidos_by_date_range(self.db, day_start, day_end, establishment.id, incluir_cancelados=True))
        regular = crud.create_produto(self.db, schemas.ProdutoCreate(nome="Lanche comum", categoria="Lanches", preco=18), establishment.id)
        crud.set_produto_grupos(self.db, regular.id, [group.id], establishment.id)
        regular_order = crud.create_pedido(self.db, schemas.PedidoCreate(
            cliente="Bia", telefone="", tipo_entrega="Retirada", forma_pagamento="PIX",
            itens=[schemas.ItemPedidoCreate(produto_id=regular.id, quantidade=1, opcoes=[schemas.ItemPedidoOpcaoCreate(opcao_id=group.opcoes[0].id)])],
        ), establishment.id)
        self.db.refresh(drink)
        self.assertEqual(drink.estoque, 10)
        crud.cancelar_pedido(self.db, regular_order.id, "Pedido duplicado", False, establishment.id)
        self.db.refresh(drink)
        self.assertEqual(drink.estoque, 10)
        crud.cancelar_pedido(self.db, order.id, "Cliente desistiu", True, establishment.id)
        self.db.refresh(drink)
        self.assertEqual(drink.estoque, 10)
        self.assertEqual([item.tipo for item in cash.movimentacoes].count("estorno"), 1)

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

    def test_dining_tab_closes_into_order_and_split_cash_payments(self):
        establishment = self.create_establishment("Bistrô", "bistro", "bistro@teste.com")
        owner = crud.get_usuario_by_email(self.db, "bistro@teste.com", establishment.id)
        session = auth.UsuarioAutenticado(establishment.id, owner.id, owner.nome, owner.email, owner.perfil, frozenset({"*"}))
        table = crud.save_mesa(self.db, schemas.MesaCreate(numero="01", capacidade=4), establishment.id)
        other = self.create_establishment("Outro", "outro-salao", "outro-salao@teste.com")
        foreign_table = crud.save_mesa(self.db, schemas.MesaCreate(numero="01"), other.id)
        product = crud.create_produto(self.db, schemas.ProdutoCreate(nome="Prato", categoria="Almoço", preco=30, preco_compra=12, controlar_estoque=True, estoque=10), establishment.id)
        tab = crud.abrir_comanda(self.db, schemas.ComandaAbrir(mesa_id=table.id, cliente="Ana", pessoas=2), session)
        self.assertEqual(table.status, "ocupada")
        with self.assertRaisesRegex(ValueError, "destino"):
            crud.transferir_comanda(self.db, tab.id, foreign_table.id, establishment.id)
        tab = crud.adicionar_item_comanda(self.db, tab.id, schemas.ComandaItemAdicionar(produto_id=product.id, quantidade=2), session)
        self.assertEqual(tab.subtotal, 60)
        self.assertEqual(product.estoque, 8)
        crud.abrir_caixa(self.db, schemas.CaixaCreate(operador="Caixa", saldo_inicial=100), establishment.id)
        tab = crud.fechar_comanda(self.db, tab.id, schemas.ComandaFechar(
            desconto=10, taxa_servico_percentual=10,
            pagamentos=[schemas.ComandaPagamentoCreate(forma_pagamento="PIX", valor=25), schemas.ComandaPagamentoCreate(forma_pagamento="Dinheiro", valor=30)],
        ), establishment.id)
        self.assertEqual(tab.status, "fechada")
        self.assertEqual(tab.total, 55)
        self.assertEqual(table.status, "livre")
        order = self.db.query(models.Pedido).filter(models.Pedido.comanda_id == tab.id).one()
        self.assertEqual(order.origem, "salao")
        self.assertEqual(order.total, 55)
        self.assertEqual(order.itens[0].custo_unitario, 12)
        self.assertEqual(order.taxa_servico, 5)
        self.assertEqual(order.taxa_entrega, 0)
        cash = crud.get_caixa_aberto(self.db, establishment.id)
        self.assertEqual(sum(m.valor for m in cash.movimentacoes), 55)

    def test_kitchen_queue_is_tenant_scoped_and_tracks_production(self):
        first = self.create_establishment("Cozinha A", "cozinha-a", "cozinha-a@teste.com")
        second = self.create_establishment("Cozinha B", "cozinha-b", "cozinha-b@teste.com")
        grill = crud.save_setor_producao(self.db, schemas.SetorProducaoCreate(nome="Chapa", cor="#ef4444"), first.id)
        product = crud.create_produto(self.db, schemas.ProdutoCreate(nome="X-Salada", categoria="Lanches", preco=25, setor_producao_id=grill.id), first.id)
        with self.assertRaisesRegex(ValueError, "Setor de produção inválido"):
            crud.create_produto(self.db, schemas.ProdutoCreate(nome="Invasor", categoria="Lanches", preco=10, setor_producao_id=grill.id), second.id)
        order = crud.create_pedido(self.db, schemas.PedidoCreate(cliente="Ana", telefone="", tipo_entrega="Retirada", forma_pagamento="Pix", itens=[schemas.ItemPedidoCreate(produto_id=product.id, quantidade=1, observacao="Sem cebola")]), first.id)
        self.assertEqual(order.itens[0].setor_producao_id, grill.id)
        self.assertEqual(crud.get_fila_cozinha(self.db, second.id), [])
        queue = crud.get_fila_cozinha(self.db, first.id, grill.id)
        self.assertEqual(queue[0]["itens"][0]["observacao"], "Sem cebola")
        item = crud.atualizar_item_cozinha(self.db, "pedido", order.itens[0].id, "em_preparo", first.id)
        self.assertIsNotNone(item.iniciado_em)
        self.assertEqual(order.status, "Em preparo")
        crud.atualizar_item_cozinha(self.db, "pedido", item.id, "pronto", first.id)
        self.assertEqual(order.status, "Pronto")

    def test_delivery_assignment_location_and_completion_are_tenant_scoped(self):
        first = self.create_establishment("Delivery A", "delivery-a", "delivery-a@teste.com")
        second = self.create_establishment("Delivery B", "delivery-b", "delivery-b@teste.com")
        driver = crud.create_usuario(self.db, schemas.UsuarioCreate(nome="Carlos", email="carlos@teste.com", senha="12345678", perfil="entregador", telefone="82999999999", veiculo="Moto", placa="ABC1D23"), first.id)
        foreign_driver = crud.create_usuario(self.db, schemas.UsuarioCreate(nome="Outro", email="outro@teste.com", senha="12345678", perfil="entregador"), second.id)
        product = crud.create_produto(self.db, schemas.ProdutoCreate(nome="Pizza", categoria="Pizzas", preco=40), first.id)
        order = crud.create_pedido(self.db, schemas.PedidoCreate(cliente="Ana", telefone="", endereco="Rua A, 10", tipo_entrega="Delivery", forma_pagamento="Pix", itens=[schemas.ItemPedidoCreate(produto_id=product.id, quantidade=1)]), first.id)
        order.status = "Pronto"; self.db.commit()
        with self.assertRaisesRegex(ValueError, "Entregador inválido"):
            crud.atribuir_entrega(self.db, order.id, foreign_driver.id, first.id)
        order = crud.atribuir_entrega(self.db, order.id, driver.id, first.id)
        self.assertEqual(order.entrega.entregador_id, driver.id)
        self.assertEqual(crud.get_pedidos_entrega(self.db, second.id), [])
        driver_session = auth.UsuarioAutenticado(first.id, driver.id, driver.nome, driver.email, "entregador", frozenset(auth.PERMISSOES_POR_PERFIL["entregador"]))
        order = crud.atualizar_status_entrega(self.db, order.id, "em_rota", driver_session)
        self.assertEqual(order.status, "Saiu entrega")
        crud.atualizar_localizacao_entrega(self.db, order.id, -9.39, -36.15, driver_session)
        self.assertEqual(round(order.entrega.latitude, 2), -9.39)
        order = crud.atualizar_status_entrega(self.db, order.id, "entregue", driver_session)
        self.assertEqual(order.status, "Finalizado")
        self.assertEqual(driver.status_entrega, "disponivel")

    def test_driver_can_see_and_accept_ready_unassigned_delivery(self):
        establishment = self.create_establishment("Entrega Livre", "entrega-livre", "livre@teste.com")
        driver = crud.create_usuario(self.db, schemas.UsuarioCreate(nome="Carlos", email="carlos-livre@teste.com", senha="12345678", perfil="entregador"), establishment.id)
        other_driver = crud.create_usuario(self.db, schemas.UsuarioCreate(nome="João", email="joao-livre@teste.com", senha="12345678", perfil="entregador"), establishment.id)
        product = crud.create_produto(self.db, schemas.ProdutoCreate(nome="Pizza", categoria="Pizzas", preco=40), establishment.id)
        order = crud.create_pedido(self.db, schemas.PedidoCreate(cliente="Ana", telefone="", endereco="Rua A, 10", tipo_entrega="Delivery", forma_pagamento="Pix", itens=[schemas.ItemPedidoCreate(produto_id=product.id, quantidade=1)]), establishment.id)
        driver_session = auth.UsuarioAutenticado(establishment.id, driver.id, driver.nome, driver.email, "entregador", frozenset(auth.PERMISSOES_POR_PERFIL["entregador"]))
        other_session = auth.UsuarioAutenticado(establishment.id, other_driver.id, other_driver.nome, other_driver.email, "entregador", frozenset(auth.PERMISSOES_POR_PERFIL["entregador"]))

        self.assertNotIn(order, crud.get_pedidos_entrega(self.db, establishment.id, driver.id))
        order.status = "Pronto"; self.db.commit()
        self.assertIn(order, crud.get_pedidos_entrega(self.db, establishment.id, driver.id))
        accepted = crud.aceitar_entrega(self.db, order.id, driver_session)
        self.assertEqual(accepted.entrega.entregador_id, driver.id)
        self.assertEqual(driver.status_entrega, "atribuido")
        self.assertNotIn(order, crud.get_pedidos_entrega(self.db, establishment.id, other_driver.id))
        with self.assertRaisesRegex(ValueError, "outro entregador"):
            crud.aceitar_entrega(self.db, order.id, other_session)

    def test_push_device_registration_is_user_and_tenant_scoped(self):
        first = self.create_establishment("Push A", "push-a", "push-a@teste.com")
        second = self.create_establishment("Push B", "push-b", "push-b@teste.com")
        first_driver = crud.create_usuario(self.db, schemas.UsuarioCreate(nome="Carlos", email="push-carlos@teste.com", senha="12345678", perfil="entregador"), first.id)
        second_driver = crud.create_usuario(self.db, schemas.UsuarioCreate(nome="João", email="push-joao@teste.com", senha="12345678", perfil="entregador"), second.id)
        first_session = auth.UsuarioAutenticado(first.id, first_driver.id, first_driver.nome, first_driver.email, "entregador", frozenset(auth.PERMISSOES_POR_PERFIL["entregador"]))
        second_session = auth.UsuarioAutenticado(second.id, second_driver.id, second_driver.nome, second_driver.email, "entregador", frozenset(auth.PERMISSOES_POR_PERFIL["entregador"]))
        token = "fcm-token-abcdefghijklmnopqrstuvwxyz"

        device = crud.register_push_device(self.db, schemas.DispositivoPushCreate(token=token, app_version="1.1.0"), first_session)
        self.assertEqual(device.usuario_id, first_driver.id)
        self.assertEqual(crud.get_push_tokens(self.db, first.id, perfil="entregador"), [token])
        self.assertEqual(crud.get_push_tokens(self.db, second.id, perfil="entregador"), [])

        moved = crud.register_push_device(self.db, schemas.DispositivoPushCreate(token=token, app_version="1.1.0"), second_session)
        self.assertEqual(moved.usuario_id, second_driver.id)
        self.assertEqual(crud.get_push_tokens(self.db, first.id, perfil="entregador"), [])
        self.assertEqual(crud.get_push_tokens(self.db, second.id, perfil="entregador"), [token])

    def test_delivery_areas_quote_and_order_fee_are_tenant_scoped(self):
        first = self.create_establishment("Entrega Centro", "entrega-centro", "centro@teste.com")
        second = self.create_establishment("Outra Unidade", "outra-entrega", "outra@teste.com")
        crud.save_configuracao_entrega(self.db, schemas.EntregaConfiguracaoUpdate(
            entrega_modo="bairro", taxa_fixa=0, pedido_minimo=20, entrega_gratis_acima=80,
            areas=[schemas.AreaEntregaBase(bairro="Centro", taxa=7, pedido_minimo=25, prazo_adicional_min=10)],
        ), first.id)
        rejected = crud.calcular_entrega(self.db, first.id, 20, bairro="Centro")
        self.assertFalse(rejected["atendido"])
        self.assertEqual(rejected["faltam_para_minimo"], 5)
        accepted = crud.calcular_entrega(self.db, first.id, 40, bairro="centro")
        self.assertTrue(accepted["atendido"])
        self.assertEqual(accepted["taxa"], 7)
        self.assertNotEqual(crud.get_configuracao_entrega(self.db, first.id)["entrega_modo"], crud.get_configuracao_entrega(self.db, second.id)["entrega_modo"])

        product = crud.create_produto(self.db, schemas.ProdutoCreate(nome="Combo", categoria="Combos", preco=20), first.id)
        order = crud.create_pedido(self.db, schemas.PedidoCreate(
            cliente="Ana", telefone="82999999999", endereco="Rua A, 10", bairro="Centro",
            tipo_entrega="Delivery", forma_pagamento="Pix",
            itens=[schemas.ItemPedidoCreate(produto_id=product.id, quantidade=2)],
        ), first.id)
        self.assertEqual(order.subtotal, 40)
        self.assertEqual(order.taxa_entrega, 7)
        self.assertEqual(order.total, 47)

    def test_delivery_distance_rejects_address_outside_radius(self):
        establishment = self.create_establishment("Entrega Raio", "entrega-raio", "raio@teste.com")
        crud.save_configuracao_entrega(self.db, schemas.EntregaConfiguracaoUpdate(
            entrega_modo="distancia", taxa_fixa=0, pedido_minimo=0, raio_km=3,
            taxa_base=4, distancia_base_km=1, taxa_por_km=2,
            latitude_origem=-9.6658, longitude_origem=-35.7350,
        ), establishment.id)
        nearby = crud.calcular_entrega(self.db, establishment.id, 30, latitude=-9.6750, longitude=-35.7350)
        self.assertTrue(nearby["atendido"])
        self.assertGreaterEqual(nearby["taxa"], 4)
        far = crud.calcular_entrega(self.db, establishment.id, 30, latitude=-9.8000, longitude=-35.7350)
        self.assertFalse(far["atendido"])
        self.assertIn("fora do raio", far["mensagem"])


if __name__ == "__main__":
    unittest.main()
