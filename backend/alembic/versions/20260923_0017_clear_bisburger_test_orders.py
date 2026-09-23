"""Limpa os pedidos de teste da BisBurger antes da inauguracao.

Revision ID: 20260923_0017
Revises: 20260923_0016

Os dados removidos das tabelas operacionais ficam preservados em um snapshot
JSON na tabela ``backups_operacionais``. A limpeza e restrita ao
estabelecimento com slug ``bisburger``.
"""
from __future__ import annotations

import datetime as dt
import json
from collections import Counter, defaultdict
from decimal import Decimal
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260923_0017"
down_revision: Union[str, None] = "20260923_0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BACKUP_KEY = "bisburger-pre-launch-orders-20260923"


def _json_default(value):
    if isinstance(value, (dt.date, dt.datetime, Decimal)):
        return str(value)
    raise TypeError(f"Tipo nao serializavel: {type(value)!r}")


def _rows(bind, statement, **params):
    return [dict(row) for row in bind.execute(sa.text(statement), params).mappings().all()]


def upgrade() -> None:
    bind = op.get_bind()
    establishment_id = bind.execute(
        sa.text("SELECT id FROM estabelecimentos WHERE slug = 'bisburger'")
    ).scalar()
    if establishment_id is None:
        return

    orders = _rows(
        bind,
        "SELECT * FROM pedidos WHERE estabelecimento_id = :establishment_id ORDER BY id",
        establishment_id=establishment_id,
    )
    if not orders:
        return

    order_ids = [row["id"] for row in orders]
    order_numbers = [row["numero"] for row in orders]
    items = _rows(
        bind,
        """
        SELECT i.* FROM itens_pedido i
        JOIN pedidos p ON p.id = i.pedido_id
        WHERE p.estabelecimento_id = :establishment_id
        ORDER BY i.id
        """,
        establishment_id=establishment_id,
    )
    options = _rows(
        bind,
        """
        SELECT o.* FROM itens_pedido_opcoes o
        JOIN itens_pedido i ON i.id = o.item_pedido_id
        JOIN pedidos p ON p.id = i.pedido_id
        WHERE p.estabelecimento_id = :establishment_id
        ORDER BY o.id
        """,
        establishment_id=establishment_id,
    )
    deliveries = _rows(
        bind,
        "SELECT * FROM entregas WHERE estabelecimento_id = :establishment_id ORDER BY id",
        establishment_id=establishment_id,
    )
    movements = _rows(
        bind,
        """
        SELECT m.* FROM movimentacoes_caixa m
        JOIN caixas c ON c.id = m.caixa_id
        WHERE c.estabelecimento_id = :establishment_id
          AND (m.descricao LIKE 'Pedido #%' OR m.descricao LIKE 'Estorno do pedido #%')
        ORDER BY m.id
        """,
        establishment_id=establishment_id,
    )
    clients = _rows(
        bind,
        "SELECT id, saldo_cashback FROM clientes WHERE estabelecimento_id = :establishment_id ORDER BY id",
        establishment_id=establishment_id,
    )
    coupons = _rows(
        bind,
        "SELECT id, codigo, usos FROM cupons WHERE estabelecimento_id = :establishment_id ORDER BY id",
        establishment_id=establishment_id,
    )
    products = _rows(
        bind,
        "SELECT id, estoque FROM produtos WHERE estabelecimento_id = :establishment_id ORDER BY id",
        establishment_id=establishment_id,
    )

    snapshot = {
        "estabelecimento_id": establishment_id,
        "pedidos": orders,
        "itens_pedido": items,
        "itens_pedido_opcoes": options,
        "entregas": deliveries,
        "movimentacoes_caixa": movements,
        "clientes_antes": clients,
        "cupons_antes": coupons,
        "produtos_antes": products,
    }
    bind.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS backups_operacionais (
            chave VARCHAR(120) PRIMARY KEY,
            criado_em VARCHAR(32) NOT NULL,
            dados TEXT NOT NULL
        )
    """))
    bind.execute(
        sa.text("INSERT INTO backups_operacionais (chave, criado_em, dados) VALUES (:key, :created_at, :data)"),
        {
            "key": BACKUP_KEY,
            "created_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "data": json.dumps(snapshot, ensure_ascii=False, default=_json_default),
        },
    )

    # Repor estoque consumido por pedidos que nao haviam sido cancelados.
    status_by_order = {row["id"]: row.get("status") for row in orders}
    stock_restore = Counter()
    item_by_id = {row["id"]: row for row in items}
    for item in items:
        if status_by_order.get(item["pedido_id"]) != "Cancelado":
            stock_restore[item["produto_id"]] += int(item.get("quantidade") or 0)
    for option in options:
        linked_id = option.get("produto_vinculado_id")
        item = item_by_id.get(option["item_pedido_id"])
        if linked_id and item and status_by_order.get(item["pedido_id"]) != "Cancelado":
            stock_restore[linked_id] += int(item.get("quantidade") or 0) * int(option.get("quantidade") or 0)
    for product_id, quantity in stock_restore.items():
        bind.execute(sa.text("""
            UPDATE produtos
               SET estoque = COALESCE(estoque, 0) + :quantity
             WHERE id = :product_id
               AND estabelecimento_id = :establishment_id
               AND controlar_estoque = TRUE
        """), {
            "quantity": quantity,
            "product_id": product_id,
            "establishment_id": establishment_id,
        })

    # Desfazer cashback usado e cashback creditado pelos pagamentos de teste.
    cashback_delta = defaultdict(float)
    for order in orders:
        client_id = order.get("cliente_id")
        if not client_id:
            continue
        cashback_delta[client_id] += float(order.get("cashback_usado") or 0)
        if order.get("pagamento_confirmado_em"):
            cashback_delta[client_id] -= round(float(order.get("total") or 0) * 0.02, 2)
    balances = {row["id"]: float(row.get("saldo_cashback") or 0) for row in clients}
    for client_id, delta in cashback_delta.items():
        new_balance = max(0.0, round(balances.get(client_id, 0.0) + delta, 2))
        bind.execute(
            sa.text("UPDATE clientes SET saldo_cashback = :balance WHERE id = :client_id AND estabelecimento_id = :establishment_id"),
            {"balance": new_balance, "client_id": client_id, "establishment_id": establishment_id},
        )

    # Liberar os usos de cupons consumidos somente pelos pedidos apagados.
    coupon_uses = Counter(row.get("cupom_codigo") for row in orders if row.get("cupom_codigo"))
    for code, count in coupon_uses.items():
        bind.execute(sa.text("""
            UPDATE cupons
               SET usos = CASE WHEN usos > :count THEN usos - :count ELSE 0 END
             WHERE estabelecimento_id = :establishment_id AND codigo = :code
        """), {"count": count, "establishment_id": establishment_id, "code": code})

    valid_descriptions = {
        description
        for number in order_numbers
        for description in (f"Pedido #{number}", f"Estorno do pedido #{number}")
    }
    for movement in movements:
        if movement.get("descricao") in valid_descriptions:
            bind.execute(sa.text("DELETE FROM movimentacoes_caixa WHERE id = :id"), {"id": movement["id"]})

    for delivery in deliveries:
        bind.execute(sa.text("""
            DELETE FROM logs_auditoria
             WHERE estabelecimento_id = :establishment_id
               AND entidade = 'entrega' AND entidade_id = :entity_id
        """), {"establishment_id": establishment_id, "entity_id": str(delivery["id"])})
    for order_id in order_ids:
        bind.execute(sa.text("""
            DELETE FROM logs_auditoria
             WHERE estabelecimento_id = :establishment_id
               AND entidade = 'pedido' AND entidade_id = :entity_id
        """), {"establishment_id": establishment_id, "entity_id": str(order_id)})

    for option in options:
        bind.execute(sa.text("DELETE FROM itens_pedido_opcoes WHERE id = :id"), {"id": option["id"]})
    for delivery in deliveries:
        bind.execute(sa.text("DELETE FROM entregas WHERE id = :id"), {"id": delivery["id"]})
    for item in items:
        bind.execute(sa.text("DELETE FROM itens_pedido WHERE id = :id"), {"id": item["id"]})
    for order_id in order_ids:
        bind.execute(sa.text("DELETE FROM pedidos WHERE id = :id"), {"id": order_id})


def downgrade() -> None:
    # A restauracao e intencionalmente manual para nao sobrescrever pedidos
    # reais criados depois da inauguracao. O snapshot permanece disponivel em
    # backups_operacionais com a chave BACKUP_KEY.
    pass
