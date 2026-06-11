"""add server default for alert_events is_processed

Revision ID: 002a4d63dfcb
Revises: d40f156ccfb1
Create Date: 2026-06-11 12:39:01.275571

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002a4d63dfcb'
down_revision: Union[str, None] = 'd40f156ccfb1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('alert_events', 'is_processed',
               existing_type=sa.Boolean(),
               server_default=sa.text('false'),
               existing_nullable=False)


def downgrade() -> None:
    op.alter_column('alert_events', 'is_processed',
               existing_type=sa.Boolean(),
               server_default=None,
               existing_nullable=False)
