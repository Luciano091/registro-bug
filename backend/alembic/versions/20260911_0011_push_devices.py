"""Dispositivos para notificações push.

Revision ID: 20260911_0011
Revises: 20260911_0010
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260911_0011"
down_revision: Union[str, None] = "20260911_0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    if "dispositivos_push" in inspect(bind).get_table_names():
        return
    op.create_table(
        "dispositivos_push",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("estabelecimento_id", sa.Integer(), sa.ForeignKey("estabelecimentos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.Text(), nullable=False, unique=True),
        sa.Column("plataforma", sa.String(), nullable=False, server_default="android"),
        sa.Column("app_version", sa.String(), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_dispositivos_push_estabelecimento_id", "dispositivos_push", ["estabelecimento_id"])
    op.create_index("ix_dispositivos_push_usuario_id", "dispositivos_push", ["usuario_id"])
    op.create_index("ix_dispositivos_push_ativo", "dispositivos_push", ["ativo"])

def downgrade() -> None:
    op.drop_table("dispositivos_push")
