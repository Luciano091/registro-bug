import importlib.util
from pathlib import Path
import types
import unittest

import sqlalchemy as sa


MIGRATION_PATH = Path(__file__).parents[1] / "alembic" / "versions" / "20260923_0016_bisburger_menu_copy.py"


class BisBurgerMenuCopyMigrationTests(unittest.TestCase):
    def test_updates_only_matching_bisburger_copy_and_can_revert(self):
        engine = sa.create_engine("sqlite:///:memory:")
        with engine.begin() as connection:
            connection.execute(sa.text("CREATE TABLE estabelecimentos (id INTEGER PRIMARY KEY, slug VARCHAR NOT NULL)"))
            connection.execute(sa.text("CREATE TABLE produtos (id INTEGER PRIMARY KEY, estabelecimento_id INTEGER, nome VARCHAR, descricao VARCHAR)"))
            connection.execute(sa.text("INSERT INTO estabelecimentos (id, slug) VALUES (1, 'bisburger'), (2, 'outra-loja')"))
            connection.execute(sa.text("""
                INSERT INTO produtos (id, estabelecimento_id, nome, descricao) VALUES
                (1, 1, 'Bis Clássico', 'Pão Brioche, Hamburguer Atesanal, Cebola Caramelisada, Molho da Casa.'),
                (2, 2, 'Bis Clássico', 'Pão Brioche, Hamburguer Atesanal, Cebola Caramelisada, Molho da Casa.'),
                (3, 1, 'Bis Clássico', 'Descrição já personalizada')
            """))

            spec = importlib.util.spec_from_file_location("bisburger_menu_copy_migration", MIGRATION_PATH)
            migration = importlib.util.module_from_spec(spec)
            assert spec and spec.loader
            spec.loader.exec_module(migration)
            migration.op = types.SimpleNamespace(execute=connection.execute)

            migration.upgrade()
            rows = connection.execute(sa.text("SELECT id, descricao FROM produtos ORDER BY id")).all()
            self.assertEqual(rows[0].descricao, "Pão brioche, hambúrguer artesanal, cebola caramelizada e molho da casa.")
            self.assertEqual(rows[1].descricao, "Pão Brioche, Hamburguer Atesanal, Cebola Caramelisada, Molho da Casa.")
            self.assertEqual(rows[2].descricao, "Descrição já personalizada")

            migration.downgrade()
            reverted = connection.execute(sa.text("SELECT descricao FROM produtos WHERE id = 1")).scalar_one()
            self.assertEqual(reverted, "Pão Brioche, Hamburguer Atesanal, Cebola Caramelisada, Molho da Casa.")


if __name__ == "__main__":
    unittest.main()
