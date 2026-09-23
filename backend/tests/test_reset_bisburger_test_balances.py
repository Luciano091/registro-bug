import importlib.util
import json
from pathlib import Path
import types
import unittest

import sqlalchemy as sa


MIGRATION_PATH = Path(__file__).parents[1] / "alembic" / "versions" / "20260923_0018_reset_bisburger_test_balances.py"


class ResetBisBurgerTestBalancesMigrationTests(unittest.TestCase):
    def test_resets_only_bisburger_and_keeps_backup(self):
        engine = sa.create_engine("sqlite:///:memory:")
        with engine.begin() as connection:
            connection.execute(sa.text("CREATE TABLE estabelecimentos (id INTEGER PRIMARY KEY, slug VARCHAR NOT NULL)"))
            connection.execute(sa.text("CREATE TABLE clientes (id INTEGER PRIMARY KEY, estabelecimento_id INTEGER, saldo_cashback FLOAT)"))
            connection.execute(sa.text("CREATE TABLE cupons (id INTEGER PRIMARY KEY, estabelecimento_id INTEGER, codigo VARCHAR, usos INTEGER)"))
            connection.execute(sa.text("INSERT INTO estabelecimentos VALUES (1,'bisburger'),(2,'outra')"))
            connection.execute(sa.text("INSERT INTO clientes VALUES (1,1,2.50),(2,2,7.00)"))
            connection.execute(sa.text("INSERT INTO cupons VALUES (1,1,'TESTE10',3),(2,2,'OUTRO',4)"))

            spec = importlib.util.spec_from_file_location("reset_bisburger_test_balances", MIGRATION_PATH)
            migration = importlib.util.module_from_spec(spec)
            assert spec and spec.loader
            spec.loader.exec_module(migration)
            migration.op = types.SimpleNamespace(get_bind=lambda: connection)
            migration.upgrade()

            self.assertEqual(connection.execute(sa.text("SELECT saldo_cashback FROM clientes WHERE id=1")).scalar_one(), 0)
            self.assertEqual(connection.execute(sa.text("SELECT saldo_cashback FROM clientes WHERE id=2")).scalar_one(), 7)
            self.assertEqual(connection.execute(sa.text("SELECT usos FROM cupons WHERE id=1")).scalar_one(), 0)
            self.assertEqual(connection.execute(sa.text("SELECT usos FROM cupons WHERE id=2")).scalar_one(), 4)
            raw = connection.execute(sa.text("SELECT dados FROM backups_operacionais WHERE chave=:key"), {"key": migration.BACKUP_KEY}).scalar_one()
            snapshot = json.loads(raw)
            self.assertEqual(snapshot["clientes_antes"][0]["saldo_cashback"], 2.5)
            self.assertEqual(snapshot["cupons_antes"][0]["usos"], 3)


if __name__ == "__main__":
    unittest.main()
