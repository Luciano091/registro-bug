"""Fecha as permissoes residuais do schema publico.

Revision ID: 20260922_0015
Revises: 20260922_0014
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260922_0015"
down_revision: Union[str, None] = "20260922_0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL PRIVILEGES ON TABLE public.alembic_version FROM anon;
                REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
            END IF;

            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL PRIVILEGES ON TABLE public.alembic_version FROM authenticated;
                REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    pass
