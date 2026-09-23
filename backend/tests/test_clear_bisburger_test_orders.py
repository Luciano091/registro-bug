import importlib.util
import json
from pathlib import Path
import types
import unittest

import sqlalchemy as sa


MIGRATION_PATH = Path(__file__).parents[1] / "alembic" / "versions" / "20260923_0017_clear_bisburger_test_orders.py"


class ClearBisBurgerTestOrdersMigrationTests(unittest.TestCase):
    def test_cleans_only_bisburger_and_reverses_test_side_effects(self):
        engine = sa.create_engine("sqlite:///:memory:")
        with engine.begin() as c:
            statements = [
                "CREATE TABLE estabelecimentos (id INTEGER PRIMARY KEY, slug VARCHAR NOT NULL)",
                "CREATE TABLE pedidos (id INTEGER PRIMARY KEY, estabelecimento_id INTEGER, numero VARCHAR, cliente_id INTEGER, status VARCHAR, total FLOAT, cashback_usado FLOAT, pagamento_confirmado_em VARCHAR, cupom_codigo VARCHAR)",
                "CREATE TABLE itens_pedido (id INTEGER PRIMARY KEY, pedido_id INTEGER, produto_id INTEGER, quantidade INTEGER)",
                "CREATE TABLE itens_pedido_opcoes (id INTEGER PRIMARY KEY, item_pedido_id INTEGER, produto_vinculado_id INTEGER, quantidade INTEGER)",
                "CREATE TABLE entregas (id INTEGER PRIMARY KEY, estabelecimento_id INTEGER, pedido_id INTEGER)",
                "CREATE TABLE clientes (id INTEGER PRIMARY KEY, estabelecimento_id INTEGER, saldo_cashback FLOAT)",
                "CREATE TABLE cupons (id INTEGER PRIMARY KEY, estabelecimento_id INTEGER, codigo VARCHAR, usos INTEGER)",
                "CREATE TABLE produtos (id INTEGER PRIMARY KEY, estabelecimento_id INTEGER, estoque INTEGER, controlar_estoque BOOLEAN)",
                "CREATE TABLE caixas (id INTEGER PRIMARY KEY, estabelecimento_id INTEGER)",
                "CREATE TABLE movimentacoes_caixa (id INTEGER PRIMARY KEY, caixa_id INTEGER, tipo VARCHAR, descricao VARCHAR)",
                "CREATE TABLE logs_auditoria (id INTEGER PRIMARY KEY, estabelecimento_id INTEGER, entidade VARCHAR, entidade_id VARCHAR)",
            ]
            for statement in statements:
                c.execute(sa.text(statement))
            c.execute(sa.text("INSERT INTO estabelecimentos VALUES (1,'bisburger'),(2,'outra')"))
            c.execute(sa.text("INSERT INTO clientes VALUES (1,1,2.30),(2,2,9.00)"))
            c.execute(sa.text("INSERT INTO cupons VALUES (1,1,'TESTE10',2),(2,2,'TESTE10',5)"))
            c.execute(sa.text("INSERT INTO produtos VALUES (1,1,10,1),(2,1,5,1),(3,2,7,1)"))
            c.execute(sa.text("INSERT INTO pedidos VALUES (1,1,'1-20260923-001',1,'Finalizado',13.49,0.00,'2026-09-23','TESTE10'),(2,1,'1-20260923-002',1,'Finalizado',14.99,0.50,'2026-09-23','TESTE10'),(3,2,'2-20260923-001',2,'Finalizado',20.00,0.00,'2026-09-23',NULL)"))
            c.execute(sa.text("INSERT INTO itens_pedido VALUES (1,1,1,1),(2,2,1,2),(3,3,3,1)"))
            c.execute(sa.text("INSERT INTO itens_pedido_opcoes VALUES (1,1,2,1)"))
            c.execute(sa.text("INSERT INTO entregas VALUES (1,1,1),(2,2,3)"))
            c.execute(sa.text("INSERT INTO caixas VALUES (1,1),(2,2)"))
            c.execute(sa.text("INSERT INTO movimentacoes_caixa VALUES (1,1,'venda','Pedido #1-20260923-001'),(2,1,'venda','Pedido #1-20260923-002'),(3,2,'venda','Pedido #2-20260923-001')"))
            c.execute(sa.text("INSERT INTO logs_auditoria VALUES (1,1,'pedido','1'),(2,1,'entrega','1'),(3,2,'pedido','3')"))

            spec = importlib.util.spec_from_file_location("clear_bisburger_test_orders", MIGRATION_PATH)
            migration = importlib.util.module_from_spec(spec)
            assert spec and spec.loader
            spec.loader.exec_module(migration)
            migration.op = types.SimpleNamespace(get_bind=lambda: c)
            migration.upgrade()

            self.assertEqual(c.execute(sa.text("SELECT id FROM pedidos ORDER BY id")).scalars().all(), [3])
            self.assertEqual(c.execute(sa.text("SELECT id FROM itens_pedido ORDER BY id")).scalars().all(), [3])
            self.assertEqual(c.execute(sa.text("SELECT id FROM entregas ORDER BY id")).scalars().all(), [2])
            self.assertEqual(c.execute(sa.text("SELECT id FROM movimentacoes_caixa ORDER BY id")).scalars().all(), [3])
            self.assertEqual(c.execute(sa.text("SELECT id FROM logs_auditoria ORDER BY id")).scalars().all(), [3])
            self.assertAlmostEqual(c.execute(sa.text("SELECT saldo_cashback FROM clientes WHERE id=1")).scalar_one(), 2.23)
            self.assertAlmostEqual(c.execute(sa.text("SELECT saldo_cashback FROM clientes WHERE id=2")).scalar_one(), 9.00)
            self.assertEqual(c.execute(sa.text("SELECT usos FROM cupons WHERE id=1")).scalar_one(), 0)
            self.assertEqual(c.execute(sa.text("SELECT usos FROM cupons WHERE id=2")).scalar_one(), 5)
            self.assertEqual(c.execute(sa.text("SELECT estoque FROM produtos WHERE id=1")).scalar_one(), 13)
            self.assertEqual(c.execute(sa.text("SELECT estoque FROM produtos WHERE id=2")).scalar_one(), 6)
            self.assertEqual(c.execute(sa.text("SELECT estoque FROM produtos WHERE id=3")).scalar_one(), 7)

            raw_snapshot = c.execute(sa.text("SELECT dados FROM backups_operacionais WHERE chave=:key"), {"key": migration.BACKUP_KEY}).scalar_one()
            snapshot = json.loads(raw_snapshot)
            self.assertEqual([row["id"] for row in snapshot["pedidos"]], [1, 2])


if __name__ == "__main__":
    unittest.main()
