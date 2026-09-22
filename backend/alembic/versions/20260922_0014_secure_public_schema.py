"""Protege as tabelas publicas contra acesso direto pela Data API.

Revision ID: 20260922_0014
Revises: 20260922_0013
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260922_0014"
down_revision: Union[str, None] = "20260922_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    # O backend usa a conexao proprietaria do PostgreSQL e continua funcionando.
    # Sem politicas, anon/authenticated nao conseguem acessar dados pela Data API.
    # O REVOKE adiciona uma segunda camada de protecao.
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
                  AND tablename <> 'alembic_version'
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
    # Reabrir todas as tabelas por downgrade seria inseguro. Se necessario, a
    # reversao deve ser explicita, apenas nas tabelas que realmente precisarem.
    pass
