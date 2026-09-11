"""Preenche e torna obrigatórios os indicadores de combo e estorno.

Revision ID: 20260910_0009
Revises: 3f4eab4dc6ca
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260910_0009"
down_revision: Union[str, None] = "3f4eab4dc6ca"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("UPDATE produtos SET is_combo = FALSE WHERE is_combo IS NULL"))
    op.execute(sa.text("UPDATE pedidos SET estornado = FALSE WHERE estornado IS NULL"))
    if op.get_bind().dialect.name == "postgresql":
        op.alter_column(
            "produtos", "is_combo", existing_type=sa.Boolean(),
            nullable=False, server_default=sa.false(),
        )
        op.alter_column(
            "pedidos", "estornado", existing_type=sa.Boolean(),
            nullable=False, server_default=sa.false(),
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.alter_column(
            "pedidos", "estornado", existing_type=sa.Boolean(),
            nullable=True, server_default=None,
        )
        op.alter_column(
            "produtos", "is_combo", existing_type=sa.Boolean(),
            nullable=True, server_default=None,
        )
