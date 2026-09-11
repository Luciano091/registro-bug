"""Garante o produto vinculado no histórico das opções do pedido.

Revision ID: 20260911_0010
Revises: 20260910_0009
Create Date: 2026-09-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260911_0010"
down_revision: Union[str, None] = "20260910_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("itens_pedido_opcoes")}
    linked_fk_exists = any(
        foreign_key.get("constrained_columns") == ["produto_vinculado_id"]
        for foreign_key in inspector.get_foreign_keys("itens_pedido_opcoes")
    )

    if bind.dialect.name == "sqlite":
        if "produto_vinculado_id" not in columns or not linked_fk_exists:
            with op.batch_alter_table("itens_pedido_opcoes") as batch_op:
                if "produto_vinculado_id" not in columns:
                    batch_op.add_column(sa.Column("produto_vinculado_id", sa.Integer(), nullable=True))
                if not linked_fk_exists:
                    batch_op.create_foreign_key(
                        "fk_item_pedido_opcao_produto_vinculado",
                        "produtos", ["produto_vinculado_id"], ["id"], ondelete="SET NULL",
                    )
        return

    if "produto_vinculado_id" not in columns:
        op.add_column(
            "itens_pedido_opcoes",
            sa.Column("produto_vinculado_id", sa.Integer(), nullable=True),
        )
    if not linked_fk_exists:
        op.create_foreign_key(
            "fk_item_pedido_opcao_produto_vinculado",
            "itens_pedido_opcoes", "produtos",
            ["produto_vinculado_id"], ["id"], ondelete="SET NULL",
        )


def downgrade() -> None:
    # Compatibilidade: bancos novos já receberam esta coluna na revisão 3f4eab4dc6ca.
    # Não removê-la evita apagar parte do histórico ao voltar apenas uma revisão.
    pass
