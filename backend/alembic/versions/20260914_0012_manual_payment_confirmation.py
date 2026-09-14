"""Registra confirmação manual de pagamento sem alterar vendas antigas.

Revision ID: 20260914_0012
Revises: 20260911_0011
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260914_0012"
down_revision: Union[str, None] = "20260911_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in inspect(bind).get_columns("pedidos")}
    if "pagamento_confirmado_em" not in columns:
        op.add_column("pedidos", sa.Column("pagamento_confirmado_em", sa.DateTime(), nullable=True))

    # Os pedidos anteriores já lançavam a venda ao criar. Preserva seu estado
    # financeiro e evita que a confirmação manual lance a mesma venda novamente.
    op.execute(sa.text("""
        UPDATE pedidos
        SET pagamento_confirmado_em = (
            SELECT MIN(m.data)
            FROM movimentacoes_caixa AS m
            JOIN caixas AS c ON c.id = m.caixa_id
            WHERE m.tipo = 'venda'
              AND m.descricao = 'Pedido #' || pedidos.numero
              AND c.estabelecimento_id = pedidos.estabelecimento_id
        )
        WHERE pagamento_confirmado_em IS NULL
          AND EXISTS (
            SELECT 1
            FROM movimentacoes_caixa AS m
            JOIN caixas AS c ON c.id = m.caixa_id
            WHERE m.tipo = 'venda'
              AND m.descricao = 'Pedido #' || pedidos.numero
              AND c.estabelecimento_id = pedidos.estabelecimento_id
          )
    """))


def downgrade() -> None:
    op.drop_column("pedidos", "pagamento_confirmado_em")
