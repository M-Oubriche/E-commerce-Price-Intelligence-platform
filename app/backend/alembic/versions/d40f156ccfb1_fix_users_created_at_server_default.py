"""fix users created_at server_default

Revision ID: d40f156ccfb1
Revises: 144d5da1e3b8
Create Date: 2026-05-02 21:55:45.000214

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd40f156ccfb1'
down_revision: Union[str, None] = '144d5da1e3b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now()")
    op.execute("ALTER TABLE user_sessions ALTER COLUMN created_at SET DEFAULT now()")
    op.execute("ALTER TABLE login_attempts ALTER COLUMN attempted_at SET DEFAULT now()")
    op.execute("ALTER TABLE email_verification_tokens ALTER COLUMN created_at SET DEFAULT now()")
    op.execute("ALTER TABLE password_reset_tokens ALTER COLUMN created_at SET DEFAULT now()")


def downgrade() -> None:
    op.execute("ALTER TABLE users ALTER COLUMN created_at DROP DEFAULT")
    op.execute("ALTER TABLE user_sessions ALTER COLUMN created_at DROP DEFAULT")
    op.execute("ALTER TABLE login_attempts ALTER COLUMN attempted_at DROP DEFAULT")
    op.execute("ALTER TABLE email_verification_tokens ALTER COLUMN created_at DROP DEFAULT")
    op.execute("ALTER TABLE password_reset_tokens ALTER COLUMN created_at DROP DEFAULT")
