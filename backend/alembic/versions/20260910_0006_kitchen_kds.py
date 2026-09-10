"""Painel de cozinha, setores e tempos de produção.

Revision ID: 20260910_0006
Revises: 20260910_0005
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260910_0006"
down_revision: Union[str, None] = "20260910_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def _add(table, column):
    if column.name not in {item["name"] for item in inspect(op.get_bind()).get_columns(table)}:
        op.add_column(table, column)

def upgrade() -> None:
    if "setores_producao" not in inspect(op.get_bind()).get_table_names():
        op.create_table("setores_producao",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("estabelecimento_id", sa.Integer(), sa.ForeignKey("estabelecimentos.id"), nullable=False),
            sa.Column("nome", sa.String(), nullable=False), sa.Column("cor", sa.String(), nullable=False, server_default="#f97316"),
            sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"), sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.UniqueConstraint("estabelecimento_id", "nome", name="uq_setor_producao_estabelecimento_nome"))
        op.create_index("ix_setores_producao_estabelecimento_id", "setores_producao", ["estabelecimento_id"])
    _add("produtos", sa.Column("setor_producao_id", sa.Integer(), nullable=True))
    _add("itens_pedido", sa.Column("setor_producao_id", sa.Integer(), nullable=True))
    _add("itens_pedido", sa.Column("status_producao", sa.String(), nullable=False, server_default="pendente"))
    _add("itens_pedido", sa.Column("criado_em", sa.DateTime(), nullable=True))
    _add("itens_pedido", sa.Column("iniciado_em", sa.DateTime(), nullable=True))
    _add("itens_pedido", sa.Column("pronto_em", sa.DateTime(), nullable=True))
    _add("comanda_itens", sa.Column("setor_producao_id", sa.Integer(), nullable=True))
    _add("comanda_itens", sa.Column("iniciado_em", sa.DateTime(), nullable=True))
    _add("comanda_itens", sa.Column("pronto_em", sa.DateTime(), nullable=True))
    bind = op.get_bind()
    bind.execute(sa.text("INSERT INTO setores_producao (estabelecimento_id, nome, cor, ordem, ativo) SELECT id, 'Cozinha', '#f97316', 0, true FROM estabelecimentos WHERE NOT EXISTS (SELECT 1 FROM setores_producao s WHERE s.estabelecimento_id = estabelecimentos.id)"))
    bind.execute(sa.text("UPDATE produtos SET setor_producao_id = (SELECT s.id FROM setores_producao s WHERE s.estabelecimento_id = produtos.estabelecimento_id ORDER BY s.ordem, s.id LIMIT 1) WHERE setor_producao_id IS NULL"))
    bind.execute(sa.text("UPDATE itens_pedido SET setor_producao_id = (SELECT p.setor_producao_id FROM produtos p WHERE p.id = itens_pedido.produto_id), criado_em = COALESCE(criado_em, (SELECT pe.data FROM pedidos pe WHERE pe.id = itens_pedido.pedido_id)), status_producao = CASE WHEN (SELECT pe.status FROM pedidos pe WHERE pe.id = itens_pedido.pedido_id) IN ('Finalizado','Concluído','Entregue','Cancelado') THEN 'finalizado' ELSE COALESCE(status_producao, 'pendente') END"))
    bind.execute(sa.text("UPDATE comanda_itens SET setor_producao_id = (SELECT p.setor_producao_id FROM produtos p WHERE p.id = comanda_itens.produto_id) WHERE setor_producao_id IS NULL"))
    for table, column in (("produtos", "setor_producao_id"), ("itens_pedido", "setor_producao_id"), ("itens_pedido", "status_producao"), ("comanda_itens", "setor_producao_id")):
        name = f"ix_{table}_{column}"
        if name not in {i["name"] for i in inspect(bind).get_indexes(table)}: op.create_index(name, table, [column])
    if bind.dialect.name == "postgresql":
        op.create_foreign_key("fk_produtos_setor_producao", "produtos", "setores_producao", ["setor_producao_id"], ["id"], ondelete="SET NULL")
        op.create_foreign_key("fk_itens_pedido_setor_producao", "itens_pedido", "setores_producao", ["setor_producao_id"], ["id"], ondelete="SET NULL")
        op.create_foreign_key("fk_comanda_itens_setor_producao", "comanda_itens", "setores_producao", ["setor_producao_id"], ["id"], ondelete="SET NULL")

def downgrade() -> None:
    for table in ("comanda_itens", "itens_pedido", "produtos"):
        for column in (["setor_producao_id", "iniciado_em", "pronto_em"] if table == "comanda_itens" else (["setor_producao_id", "status_producao", "criado_em", "iniciado_em", "pronto_em"] if table == "itens_pedido" else ["setor_producao_id"])):
            op.drop_column(table, column)
    op.drop_table("setores_producao")
