"""Catálogo com grupos, opções e retrato do item vendido.

Revision ID: 20260909_0002
Revises: 20260909_0001
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260909_0002"
down_revision: Union[str, None] = "20260909_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "grupos_opcoes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("estabelecimento_id", sa.Integer(), sa.ForeignKey("estabelecimentos.id"), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("minimo", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("maximo", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("obrigatorio", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("estabelecimento_id", "nome", name="uq_grupo_opcao_estabelecimento_nome"),
    )
    op.create_index("ix_grupos_opcoes_estabelecimento_id", "grupos_opcoes", ["estabelecimento_id"])
    op.create_table(
        "opcoes_produto",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("grupo_id", sa.Integer(), sa.ForeignKey("grupos_opcoes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("preco_adicional", sa.Float(), nullable=False, server_default="0"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_opcoes_produto_grupo_id", "opcoes_produto", ["grupo_id"])
    op.create_table(
        "produto_grupos_opcoes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("produto_id", sa.Integer(), sa.ForeignKey("produtos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("grupo_id", sa.Integer(), sa.ForeignKey("grupos_opcoes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("produto_id", "grupo_id", name="uq_produto_grupo_opcao"),
    )
    op.create_index("ix_produto_grupos_opcoes_produto_id", "produto_grupos_opcoes", ["produto_id"])
    op.create_index("ix_produto_grupos_opcoes_grupo_id", "produto_grupos_opcoes", ["grupo_id"])
    item_columns = {column["name"] for column in inspect(op.get_bind()).get_columns("itens_pedido")}
    if "produto_nome" not in item_columns:
        op.add_column("itens_pedido", sa.Column("produto_nome", sa.String(), nullable=True))
    if "observacao" not in item_columns:
        op.add_column("itens_pedido", sa.Column("observacao", sa.Text(), nullable=True))
    op.execute(sa.text("UPDATE itens_pedido SET produto_nome = (SELECT nome FROM produtos WHERE produtos.id = itens_pedido.produto_id) WHERE produto_nome IS NULL"))
    op.create_table(
        "itens_pedido_opcoes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("item_pedido_id", sa.Integer(), sa.ForeignKey("itens_pedido.id", ondelete="CASCADE"), nullable=False),
        sa.Column("opcao_id", sa.Integer(), sa.ForeignKey("opcoes_produto.id", ondelete="SET NULL"), nullable=True),
        sa.Column("grupo_nome", sa.String(), nullable=False),
        sa.Column("opcao_nome", sa.String(), nullable=False),
        sa.Column("preco_unitario", sa.Float(), nullable=False, server_default="0"),
        sa.Column("quantidade", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("subtotal", sa.Float(), nullable=False, server_default="0"),
    )
    op.create_index("ix_itens_pedido_opcoes_item_pedido_id", "itens_pedido_opcoes", ["item_pedido_id"])


def downgrade() -> None:
    op.drop_table("itens_pedido_opcoes")
    op.drop_column("itens_pedido", "observacao")
    op.drop_column("itens_pedido", "produto_nome")
    op.drop_table("produto_grupos_opcoes")
    op.drop_table("opcoes_produto")
    op.drop_table("grupos_opcoes")
