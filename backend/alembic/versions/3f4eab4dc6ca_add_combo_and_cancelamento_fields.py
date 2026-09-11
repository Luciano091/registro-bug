"""Add combo and cancelamento fields

Revision ID: 3f4eab4dc6ca
Revises: 18563862f462
Create Date: 2026-09-10 17:52:41.187858
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = '3f4eab4dc6ca'
down_revision: Union[str, None] = '18563862f462'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('opcoes_produto') as batch_op:
        batch_op.add_column(sa.Column('produto_vinculado_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_opcao_produto_vinculado', 'produtos', ['produto_vinculado_id'], ['id'], ondelete='SET NULL')
    with op.batch_alter_table('itens_pedido_opcoes') as batch_op:
        batch_op.add_column(sa.Column('produto_vinculado_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_item_pedido_opcao_produto_vinculado', 'produtos', ['produto_vinculado_id'], ['id'], ondelete='SET NULL')
    inspector = inspect(op.get_bind())
    pedido_columns = {column['name'] for column in inspector.get_columns('pedidos')}
    produto_columns = {column['name'] for column in inspector.get_columns('produtos')}
    if 'motivo_cancelamento' not in pedido_columns:
        op.add_column('pedidos', sa.Column('motivo_cancelamento', sa.Text(), nullable=True))
    if 'estornado' not in pedido_columns:
        op.add_column('pedidos', sa.Column('estornado', sa.Boolean(), nullable=False, server_default=sa.false()))
    if 'is_combo' not in produto_columns:
        op.add_column('produtos', sa.Column('is_combo', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('produtos', 'is_combo')
    op.drop_column('pedidos', 'estornado')
    op.drop_column('pedidos', 'motivo_cancelamento')
    with op.batch_alter_table('itens_pedido_opcoes') as batch_op:
        batch_op.drop_constraint('fk_item_pedido_opcao_produto_vinculado', type_='foreignkey')
        batch_op.drop_column('produto_vinculado_id')
    with op.batch_alter_table('opcoes_produto') as batch_op:
        batch_op.drop_constraint('fk_opcao_produto_vinculado', type_='foreignkey')
        batch_op.drop_column('produto_vinculado_id')
