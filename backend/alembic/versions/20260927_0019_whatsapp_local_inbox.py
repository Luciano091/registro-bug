"""Cria caixa de entrada para o gateway local do WhatsApp.

Revision ID: 20260927_0019
Revises: 20260923_0018
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260927_0019"
down_revision: Union[str, None] = "20260923_0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    existing = set(inspect(op.get_bind()).get_table_names())
    required = {
        "whatsapp_gateway_states",
        "whatsapp_conversations",
        "whatsapp_chat_messages",
    }
    # A migração-base usa metadata.create_all e, em instalações novas, já cria
    # estas tabelas. Em instalações existentes, os blocos abaixo as adicionam.
    if required.issubset(existing):
        return

    op.create_table(
        "whatsapp_gateway_states",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("estabelecimento_id", sa.Integer(), sa.ForeignKey("estabelecimentos.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("connection", sa.String(), nullable=False, server_default="offline"),
        sa.Column("connected_number", sa.String(), nullable=True),
        sa.Column("automation_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("needs_qr", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_whatsapp_gateway_states_estabelecimento_id", "whatsapp_gateway_states", ["estabelecimento_id"], unique=True)
    op.create_index("ix_whatsapp_gateway_states_connection", "whatsapp_gateway_states", ["connection"])
    op.create_index("ix_whatsapp_gateway_states_last_seen_at", "whatsapp_gateway_states", ["last_seen_at"])

    op.create_table(
        "whatsapp_conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("estabelecimento_id", sa.Integer(), sa.ForeignKey("estabelecimentos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chat_id", sa.String(), nullable=False),
        sa.Column("telefone", sa.String(), nullable=True),
        sa.Column("nome", sa.String(), nullable=True),
        sa.Column("atendimento_modo", sa.String(), nullable=False, server_default="bot"),
        sa.Column("handoff_requested", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("nao_lidas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ultima_mensagem", sa.Text(), nullable=True),
        sa.Column("ultima_interacao", sa.DateTime(), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("estabelecimento_id", "chat_id", name="uq_whatsapp_conversation_chat"),
    )
    op.create_index("ix_whatsapp_conversations_estabelecimento_id", "whatsapp_conversations", ["estabelecimento_id"])
    op.create_index("ix_whatsapp_conversations_chat_id", "whatsapp_conversations", ["chat_id"])
    op.create_index("ix_whatsapp_conversations_telefone", "whatsapp_conversations", ["telefone"])
    op.create_index("ix_whatsapp_conversations_atendimento_modo", "whatsapp_conversations", ["atendimento_modo"])
    op.create_index("ix_whatsapp_conversations_handoff_requested", "whatsapp_conversations", ["handoff_requested"])
    op.create_index("ix_whatsapp_conversations_ultima_interacao", "whatsapp_conversations", ["ultima_interacao"])

    op.create_table(
        "whatsapp_chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversa_id", sa.Integer(), sa.ForeignKey("whatsapp_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("external_id", sa.String(), nullable=True, unique=True),
        sa.Column("direcao", sa.String(), nullable=False),
        sa.Column("remetente", sa.String(), nullable=False, server_default="cliente"),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="received"),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("enviado_em", sa.DateTime(), nullable=True),
        sa.Column("ultima_tentativa_em", sa.DateTime(), nullable=True),
        sa.Column("erro", sa.Text(), nullable=True),
    )
    op.create_index("ix_whatsapp_chat_messages_conversa_id", "whatsapp_chat_messages", ["conversa_id"])
    op.create_index("ix_whatsapp_chat_messages_external_id", "whatsapp_chat_messages", ["external_id"], unique=True)
    op.create_index("ix_whatsapp_chat_messages_direcao", "whatsapp_chat_messages", ["direcao"])
    op.create_index("ix_whatsapp_chat_messages_status", "whatsapp_chat_messages", ["status"])
    op.create_index("ix_whatsapp_chat_messages_criado_em", "whatsapp_chat_messages", ["criado_em"])


def downgrade() -> None:
    op.drop_table("whatsapp_chat_messages")
    op.drop_table("whatsapp_conversations")
    op.drop_table("whatsapp_gateway_states")
