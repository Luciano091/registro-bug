"""Expedição, entregadores e rastreamento.

Revision ID: 20260910_0007
Revises: 20260910_0006
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260910_0007"
down_revision: Union[str, None] = "20260910_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def _add(table, column):
    if column.name not in {item["name"] for item in inspect(op.get_bind()).get_columns(table)}:
        op.add_column(table, column)

def upgrade() -> None:
    _add("usuarios", sa.Column("telefone", sa.String(), nullable=True))
    _add("usuarios", sa.Column("veiculo", sa.String(), nullable=True))
    _add("usuarios", sa.Column("placa", sa.String(), nullable=True))
    _add("usuarios", sa.Column("status_entrega", sa.String(), nullable=False, server_default="disponivel"))
    bind = op.get_bind()
    if "ix_usuarios_status_entrega" not in {i["name"] for i in inspect(bind).get_indexes("usuarios")}:
        op.create_index("ix_usuarios_status_entrega", "usuarios", ["status_entrega"])
    if "entregas" not in inspect(bind).get_table_names():
        op.create_table("entregas",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("estabelecimento_id", sa.Integer(), sa.ForeignKey("estabelecimentos.id"), nullable=False),
            sa.Column("pedido_id", sa.Integer(), sa.ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("entregador_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
            sa.Column("status", sa.String(), nullable=False, server_default="aguardando"), sa.Column("observacao", sa.Text(), nullable=True),
            sa.Column("atribuido_em", sa.DateTime(), nullable=True), sa.Column("retirado_em", sa.DateTime(), nullable=True), sa.Column("entregue_em", sa.DateTime(), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=True), sa.Column("longitude", sa.Float(), nullable=True), sa.Column("localizacao_atualizada_em", sa.DateTime(), nullable=True))
        op.create_index("ix_entregas_estabelecimento_id", "entregas", ["estabelecimento_id"])
        op.create_index("ix_entregas_pedido_id", "entregas", ["pedido_id"], unique=True)
        op.create_index("ix_entregas_entregador_id", "entregas", ["entregador_id"])
        op.create_index("ix_entregas_status", "entregas", ["status"])

def downgrade() -> None:
    op.drop_table("entregas")
    for column in ("status_entrega", "placa", "veiculo", "telefone"):
        op.drop_column("usuarios", column)
