"""Ativa Row Level Security (RLS) e revoga privilegios publicos em todas as tabelas.

Revision ID: 20261021_0020
Revises: 20260927_0019
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261021_0020"
down_revision: Union[str, None] = "20260927_0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        DO $$
        DECLARE
            table_record record;
        BEGIN
            FOR table_record IN
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
            LOOP
                EXECUTE format(
                    'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
                    table_record.tablename
                );

                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                    EXECUTE format(
                        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon',
                        table_record.tablename
                    );
                END IF;

                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                    EXECUTE format(
                        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated',
                        table_record.tablename
                    );
                END IF;
            END LOOP;
        END
        $$;
        """
    )


def downgrade() -> None:
    pass
