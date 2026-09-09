"""Cupons validados pelo servidor.

Revision ID: 20260909_0004
Revises: 20260909_0003
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260909_0004"
down_revision: Union[str, None] = "20260909_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cupons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("estabelecimento_id", sa.Integer(), sa.ForeignKey("estabelecimentos.id"), nullable=False),
        sa.Column("codigo", sa.String(), nullable=False),
        sa.Column("descricao", sa.String(), nullable=True),
        sa.Column("tipo", sa.String(), nullable=False, server_default="percentual"),
        sa.Column("valor", sa.Float(), nullable=False),
        sa.Column("pedido_minimo", sa.Float(), nullable=False, server_default="0"),
        sa.Column("inicio", sa.DateTime(), nullable=True),
        sa.Column("fim", sa.DateTime(), nullable=True),
        sa.Column("limite_usos", sa.Integer(), nullable=True),
        sa.Column("usos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("estabelecimento_id", "codigo", name="uq_cupom_estabelecimento_codigo"),
    )
    op.create_index("ix_cupons_estabelecimento_id", "cupons", ["estabelecimento_id"])
    columns = {column["name"] for column in inspect(op.get_bind()).get_columns("pedidos")}
    if "cupom_codigo" not in columns:
        op.add_column("pedidos", sa.Column("cupom_codigo", sa.String(), nullable=True))
    if "desconto" not in columns:
        op.add_column("pedidos", sa.Column("desconto", sa.Float(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("pedidos", "desconto")
    op.drop_column("pedidos", "cupom_codigo")
    op.drop_table("cupons")
