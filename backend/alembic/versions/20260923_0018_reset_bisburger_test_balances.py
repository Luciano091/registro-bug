"""Zera saldos e contadores residuais dos testes da BisBurger.

Revision ID: 20260923_0018
Revises: 20260923_0017
"""
from __future__ import annotations

import datetime as dt
import json
from decimal import Decimal
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260923_0018"
down_revision: Union[str, None] = "20260923_0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BACKUP_KEY = "bisburger-pre-launch-balances-20260923"


def _json_default(value):
    if isinstance(value, (dt.date, dt.datetime, Decimal)):
        return str(value)
    raise TypeError(f"Tipo nao serializavel: {type(value)!r}")


def upgrade() -> None:
    bind = op.get_bind()
    establishment_id = bind.execute(
        sa.text("SELECT id FROM estabelecimentos WHERE slug = 'bisburger'")
    ).scalar()
    if establishment_id is None:
        return

    clients = [dict(row) for row in bind.execute(sa.text("""
        SELECT id, saldo_cashback
          FROM clientes
         WHERE estabelecimento_id = :establishment_id
         ORDER BY id
    """), {"establishment_id": establishment_id}).mappings().all()]
    coupons = [dict(row) for row in bind.execute(sa.text("""
        SELECT id, codigo, usos
          FROM cupons
         WHERE estabelecimento_id = :establishment_id
         ORDER BY id
    """), {"establishment_id": establishment_id}).mappings().all()]

    bind.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS backups_operacionais (
            chave VARCHAR(120) PRIMARY KEY,
            criado_em VARCHAR(40) NOT NULL,
            dados TEXT NOT NULL
        )
    """))
    existing = bind.execute(
        sa.text("SELECT chave FROM backups_operacionais WHERE chave = :key"),
        {"key": BACKUP_KEY},
    ).scalar()
    if existing is None:
        bind.execute(sa.text("""
            INSERT INTO backups_operacionais (chave, criado_em, dados)
            VALUES (:key, :created_at, :data)
        """), {
            "key": BACKUP_KEY,
            "created_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "data": json.dumps(
                {"estabelecimento_id": establishment_id, "clientes_antes": clients, "cupons_antes": coupons},
                ensure_ascii=False,
                default=_json_default,
            ),
        })

    bind.execute(sa.text("""
        UPDATE clientes
           SET saldo_cashback = 0
         WHERE estabelecimento_id = :establishment_id
    """), {"establishment_id": establishment_id})
    bind.execute(sa.text("""
        UPDATE cupons
           SET usos = 0
         WHERE estabelecimento_id = :establishment_id
    """), {"establishment_id": establishment_id})


def downgrade() -> None:
    # Restauracao manual para nao sobrescrever saldos reais acumulados apos a
    # inauguracao. O snapshot fica em backups_operacionais.
    pass
