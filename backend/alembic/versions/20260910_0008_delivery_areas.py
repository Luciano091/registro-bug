"""Áreas, taxas e limites de entrega.

Revision ID: 20260910_0008
Revises: 20260910_0007
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260910_0008"
down_revision: Union[str, None] = "20260910_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add(table: str, column: sa.Column) -> None:
    if column.name not in {item["name"] for item in inspect(op.get_bind()).get_columns(table)}:
        op.add_column(table, column)


def upgrade() -> None:
    _add("configuracoes", sa.Column("entrega_habilitada", sa.Boolean(), nullable=False, server_default=sa.true()))
    _add("configuracoes", sa.Column("entrega_modo", sa.String(), nullable=False, server_default="fixa"))
    _add("configuracoes", sa.Column("pedido_minimo_entrega", sa.Float(), nullable=False, server_default="0"))
    _add("configuracoes", sa.Column("entrega_gratis_acima", sa.Float(), nullable=True))
    _add("configuracoes", sa.Column("raio_entrega_km", sa.Float(), nullable=True))
    _add("configuracoes", sa.Column("taxa_base_entrega", sa.Float(), nullable=False, server_default="0"))
    _add("configuracoes", sa.Column("distancia_base_km", sa.Float(), nullable=False, server_default="0"))
    _add("configuracoes", sa.Column("taxa_por_km", sa.Float(), nullable=False, server_default="0"))
    _add("configuracoes", sa.Column("latitude", sa.Float(), nullable=True))
    _add("configuracoes", sa.Column("longitude", sa.Float(), nullable=True))
    _add("pedidos", sa.Column("bairro", sa.String(), nullable=True))
    _add("pedidos", sa.Column("latitude_entrega", sa.Float(), nullable=True))
    _add("pedidos", sa.Column("longitude_entrega", sa.Float(), nullable=True))

    if "areas_entrega" not in inspect(op.get_bind()).get_table_names():
        op.create_table(
            "areas_entrega",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("estabelecimento_id", sa.Integer(), sa.ForeignKey("estabelecimentos.id", ondelete="CASCADE"), nullable=False),
            sa.Column("bairro", sa.String(), nullable=False),
            sa.Column("bairro_normalizado", sa.String(), nullable=False),
            sa.Column("taxa", sa.Float(), nullable=False, server_default="0"),
            sa.Column("pedido_minimo", sa.Float(), nullable=False, server_default="0"),
            sa.Column("prazo_adicional_min", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.UniqueConstraint("estabelecimento_id", "bairro_normalizado", name="uq_area_entrega_bairro"),
        )
        op.create_index("ix_areas_entrega_estabelecimento_id", "areas_entrega", ["estabelecimento_id"])


def downgrade() -> None:
    bind = op.get_bind()
    if "areas_entrega" in inspect(bind).get_table_names():
        op.drop_table("areas_entrega")
    for column in ("longitude_entrega", "latitude_entrega", "bairro"):
        op.drop_column("pedidos", column)
    for column in (
        "longitude", "latitude", "taxa_por_km", "distancia_base_km", "taxa_base_entrega",
        "raio_entrega_km", "entrega_gratis_acima", "pedido_minimo_entrega", "entrega_modo", "entrega_habilitada",
    ):
        op.drop_column("configuracoes", column)
