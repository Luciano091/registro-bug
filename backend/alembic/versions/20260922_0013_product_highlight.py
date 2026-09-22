"""Adiciona destaque controlado pelo painel aos produtos.

Revision ID: 20260922_0013
Revises: 20260914_0012
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260922_0013"
down_revision: Union[str, None] = "20260914_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in inspect(bind).get_columns("produtos")}
    if "is_destaque" not in columns:
        op.add_column(
            "produtos",
            sa.Column("is_destaque", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
        op.create_index("ix_produtos_is_destaque", "produtos", ["is_destaque"])


def downgrade() -> None:
    columns = {column["name"] for column in inspect(op.get_bind()).get_columns("produtos")}
    if "is_destaque" in columns:
        op.drop_index("ix_produtos_is_destaque", table_name="produtos")
        op.drop_column("produtos", "is_destaque")
