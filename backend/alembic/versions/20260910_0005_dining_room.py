"""Mesas, comandas e pagamentos do salão.

Revision ID: 20260910_0005
Revises: 20260909_0004
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260910_0005"
down_revision: Union[str, None] = "20260909_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mesas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("estabelecimento_id", sa.Integer(), sa.ForeignKey("estabelecimentos.id"), nullable=False),
        sa.Column("numero", sa.String(), nullable=False), sa.Column("nome", sa.String(), nullable=True),
        sa.Column("capacidade", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("status", sa.String(), nullable=False, server_default="livre"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("estabelecimento_id", "numero", name="uq_mesa_estabelecimento_numero"),
    )
    op.create_index("ix_mesas_estabelecimento_id", "mesas", ["estabelecimento_id"])
    op.create_index("ix_mesas_status", "mesas", ["status"])
    op.create_table(
        "comandas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("estabelecimento_id", sa.Integer(), sa.ForeignKey("estabelecimentos.id"), nullable=False),
        sa.Column("mesa_id", sa.Integer(), sa.ForeignKey("mesas.id"), nullable=False),
        sa.Column("numero", sa.String(), nullable=False), sa.Column("cliente", sa.String(), nullable=True),
        sa.Column("pessoas", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(), nullable=False, server_default="aberta"),
        sa.Column("observacao", sa.Text(), nullable=True),
        sa.Column("aberta_por_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("aberta_por_nome", sa.String(), nullable=False),
        sa.Column("aberta_em", sa.DateTime(), nullable=False), sa.Column("fechada_em", sa.DateTime(), nullable=True),
        sa.Column("subtotal", sa.Float(), nullable=False, server_default="0"),
        sa.Column("desconto", sa.Float(), nullable=False, server_default="0"),
        sa.Column("taxa_servico", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total", sa.Float(), nullable=False, server_default="0"),
    )
    op.create_index("ix_comandas_estabelecimento_id", "comandas", ["estabelecimento_id"])
    op.create_index("ix_comandas_mesa_id", "comandas", ["mesa_id"])
    op.create_index("ix_comandas_status", "comandas", ["status"])
    op.create_table(
        "comanda_itens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("comanda_id", sa.Integer(), sa.ForeignKey("comandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("produto_id", sa.Integer(), sa.ForeignKey("produtos.id"), nullable=False),
        sa.Column("produto_nome", sa.String(), nullable=False), sa.Column("quantidade", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("custo_unitario", sa.Float(), nullable=False, server_default="0"),
        sa.Column("valor_unitario", sa.Float(), nullable=False), sa.Column("subtotal", sa.Float(), nullable=False),
        sa.Column("observacao", sa.Text(), nullable=True), sa.Column("opcoes_json", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="enviado"),
        sa.Column("criado_por_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=False), sa.Column("atualizado_em", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_comanda_itens_comanda_id", "comanda_itens", ["comanda_id"])
    op.create_index("ix_comanda_itens_status", "comanda_itens", ["status"])
    op.create_table(
        "comanda_pagamentos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("comanda_id", sa.Integer(), sa.ForeignKey("comandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("forma_pagamento", sa.String(), nullable=False), sa.Column("valor", sa.Float(), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_comanda_pagamentos_comanda_id", "comanda_pagamentos", ["comanda_id"])
    columns = {column["name"] for column in inspect(op.get_bind()).get_columns("pedidos")}
    if "origem" not in columns:
        op.add_column("pedidos", sa.Column("origem", sa.String(), nullable=False, server_default="balcao"))
    if "comanda_id" not in columns:
        op.add_column("pedidos", sa.Column("comanda_id", sa.Integer(), nullable=True))
        if op.get_bind().dialect.name == "postgresql":
            op.create_foreign_key("fk_pedidos_comanda_id", "pedidos", "comandas", ["comanda_id"], ["id"])
        op.create_index("ix_pedidos_comanda_id", "pedidos", ["comanda_id"], unique=True)
    if "taxa_servico" not in columns:
        op.add_column("pedidos", sa.Column("taxa_servico", sa.Float(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_index("ix_pedidos_comanda_id", table_name="pedidos")
    op.drop_column("pedidos", "taxa_servico"); op.drop_column("pedidos", "comanda_id"); op.drop_column("pedidos", "origem")
    op.drop_table("comanda_pagamentos"); op.drop_table("comanda_itens"); op.drop_table("comandas"); op.drop_table("mesas")
