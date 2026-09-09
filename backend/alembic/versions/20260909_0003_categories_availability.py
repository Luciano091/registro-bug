"""Categorias, disponibilidade e promoções programadas.

Revision ID: 20260909_0003
Revises: 20260909_0002
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260909_0003"
down_revision: Union[str, None] = "20260909_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categorias",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("estabelecimento_id", sa.Integer(), sa.ForeignKey("estabelecimentos.id"), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("descricao", sa.String(), nullable=True),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("dias_semana", sa.String(), nullable=False, server_default="0,1,2,3,4,5,6"),
        sa.Column("horario_inicio", sa.String(), nullable=True),
        sa.Column("horario_fim", sa.String(), nullable=True),
        sa.UniqueConstraint("estabelecimento_id", "nome", name="uq_categoria_estabelecimento_nome"),
    )
    op.create_index("ix_categorias_estabelecimento_id", "categorias", ["estabelecimento_id"])
    columns = {column["name"] for column in inspect(op.get_bind()).get_columns("produtos")}
    additions = [
        ("categoria_id", sa.Column("categoria_id", sa.Integer(), nullable=True)),
        ("dias_semana", sa.Column("dias_semana", sa.String(), nullable=False, server_default="0,1,2,3,4,5,6")),
        ("horario_inicio", sa.Column("horario_inicio", sa.String(), nullable=True)),
        ("horario_fim", sa.Column("horario_fim", sa.String(), nullable=True)),
        ("disponivel_delivery", sa.Column("disponivel_delivery", sa.Boolean(), nullable=False, server_default=sa.true())),
        ("disponivel_retirada", sa.Column("disponivel_retirada", sa.Boolean(), nullable=False, server_default=sa.true())),
        ("disponivel_salao", sa.Column("disponivel_salao", sa.Boolean(), nullable=False, server_default=sa.true())),
        ("promocao_inicio", sa.Column("promocao_inicio", sa.DateTime(), nullable=True)),
        ("promocao_fim", sa.Column("promocao_fim", sa.DateTime(), nullable=True)),
    ]
    for name, column in additions:
        if name not in columns:
            op.add_column("produtos", column)
    if "categoria_id" not in columns and op.get_bind().dialect.name == "postgresql":
        op.create_foreign_key("fk_produtos_categoria_id", "produtos", "categorias", ["categoria_id"], ["id"], ondelete="SET NULL")
    product_indexes = {index["name"] for index in inspect(op.get_bind()).get_indexes("produtos")}
    if "ix_produtos_categoria_id" not in product_indexes:
        op.create_index("ix_produtos_categoria_id", "produtos", ["categoria_id"])
    connection = op.get_bind()
    rows = connection.execute(sa.text("SELECT DISTINCT estabelecimento_id, categoria FROM produtos WHERE estabelecimento_id IS NOT NULL AND categoria IS NOT NULL AND categoria <> ''")).fetchall()
    for order, row in enumerate(rows):
        connection.execute(sa.text("INSERT INTO categorias (estabelecimento_id, nome, ordem, ativo, dias_semana) VALUES (:est, :nome, :ordem, :ativo, :dias)"), {"est": row[0], "nome": row[1], "ordem": order, "ativo": True, "dias": "0,1,2,3,4,5,6"})
    connection.execute(sa.text("UPDATE produtos SET categoria_id = (SELECT categorias.id FROM categorias WHERE categorias.estabelecimento_id = produtos.estabelecimento_id AND categorias.nome = produtos.categoria) WHERE categoria_id IS NULL"))


def downgrade() -> None:
    op.drop_index("ix_produtos_categoria_id", table_name="produtos")
    for column in ("promocao_fim", "promocao_inicio", "disponivel_salao", "disponivel_retirada", "disponivel_delivery", "horario_fim", "horario_inicio", "dias_semana", "categoria_id"):
        op.drop_column("produtos", column)
    op.drop_table("categorias")
