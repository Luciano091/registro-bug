"""Corrige textos pontuais do cardapio BisBurger.

Revision ID: 20260923_0016
Revises: 20260922_0015
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260923_0016"
down_revision: Union[str, None] = "20260922_0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


COPY_CHANGES = (
    ("Bis Egg", "Hamburger artesanal + queijo + ovo + salada + molho", "Hambúrguer artesanal + queijo + ovo + salada + molho."),
    ("Bis Clássico", "Pão Brioche, Hamburguer Atesanal, Cebola Caramelisada, Molho da Casa.", "Pão brioche, hambúrguer artesanal, cebola caramelizada e molho da casa."),
    ("Bis Bacon", "Hamburguer artesanal + queijo + bacon + molho", "Hambúrguer artesanal + queijo + bacon + molho."),
    ("X - Burguer ", "Pão, Hamburguer Tradicional, Queijo, Presunto, Tomate, Alface", "Pão, hambúrguer tradicional, queijo, presunto, tomate e alface."),
    ("Minuano", "Pão, Hamburguer Tradicional, Queijo, Presunto, Ovo, Tomate, Alface", "Pão, hambúrguer tradicional, queijo, presunto, ovo, tomate e alface."),
    ("Combo Individual", "Hambúrguer artesanal+ batata + refrigerante lata.", "Hambúrguer artesanal + batata + refrigerante em lata."),
    ("Combo Duplo", "2 hambúrgueres artesanal+ batata maior + 2 refrigerantes.", "2 hambúrgueres artesanais + batata maior + 2 refrigerantes."),
    ("Combo Família", "4 hambúrgueres artesanal + 2 batatas + refrigerante 1,5", "4 hambúrgueres artesanais + 2 batatas + refrigerante de 1,5 L."),
)


def _apply(from_index: int, to_index: int) -> None:
    statement = sa.text(
        """
        UPDATE produtos
           SET descricao = :new_description
         WHERE estabelecimento_id = (
                   SELECT id FROM estabelecimentos WHERE slug = 'bisburger'
               )
           AND nome = :product_name
           AND descricao = :old_description
        """
    )
    for change in COPY_CHANGES:
        op.execute(statement.bindparams(
            product_name=change[0],
            old_description=change[from_index],
            new_description=change[to_index],
        ))


def upgrade() -> None:
    _apply(1, 2)


def downgrade() -> None:
    _apply(2, 1)
