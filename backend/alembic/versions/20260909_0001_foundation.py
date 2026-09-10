"""Fundação de migrações, usuários e auditoria.

Revision ID: 20260909_0001
Revises:
Create Date: 2026-09-09
"""
from typing import Sequence, Union

import bcrypt
from alembic import op
from sqlalchemy import inspect, select

import models

revision: str = "20260909_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Mantém a primeira implantação segura tanto em bancos novos quanto no banco
    # já usado pelo BisBurger. As próximas alterações serão migrações incrementais.
    catalog_tables = {"categorias", "cupons", "grupos_opcoes", "opcoes_produto", "produto_grupos_opcoes", "itens_pedido_opcoes", "mesas", "comandas", "comanda_itens", "comanda_pagamentos"}
    models.Base.metadata.create_all(
        bind=op.get_bind(),
        tables=[table for table in models.Base.metadata.tables.values() if table.name not in catalog_tables],
    )
    connection = op.get_bind()
    estabelecimentos = connection.execute(
        select(
            models.Estabelecimento.id, models.Estabelecimento.nome,
            models.Estabelecimento.slug, models.Estabelecimento.email,
        )
    ).mappings().all()
    for estabelecimento in estabelecimentos:
        owner_exists = connection.execute(
            select(models.Usuario.id).where(
                models.Usuario.estabelecimento_id == estabelecimento["id"],
                models.Usuario.perfil == "proprietario",
            ).limit(1)
        ).first()
        if owner_exists:
            continue
        senha = connection.execute(
            select(models.Configuracao.senha_admin).where(
                models.Configuracao.estabelecimento_id == estabelecimento["id"]
            ).limit(1)
        ).scalar_one_or_none() or "burger123"
        senha_hash = senha if senha.startswith(("$2a$", "$2b$", "$2y$")) else bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()
        connection.execute(models.Usuario.__table__.insert().values(
            estabelecimento_id=estabelecimento["id"],
            nome=estabelecimento["nome"],
            email=(estabelecimento["email"] or f"proprietario@{estabelecimento['slug']}.ritmesa").strip().lower(),
            senha_hash=senha_hash,
            perfil="proprietario",
            ativo=True,
            criado_em=models.get_now(),
        ))


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(inspect(bind).get_table_names())
    if "logs_auditoria" in tables:
        op.drop_table("logs_auditoria")
    if "usuarios" in tables:
        op.drop_table("usuarios")
