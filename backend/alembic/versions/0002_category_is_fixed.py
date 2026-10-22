"""add categories.is_fixed

Marks expense categories that are fixed monthly costs (rent, utilities...), so
reports can split living costs into fixed and variable. Existing rows get false.

Revision ID: 0002_category_is_fixed
Revises: 0001_baseline
Create Date: 2026-10-21 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002_category_is_fixed"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Batch mode rebuilds the table where SQLite can't ALTER in place; the server
    # default fills existing rows so the column can be NOT NULL.
    with op.batch_alter_table("categories") as batch:
        batch.add_column(sa.Column("is_fixed", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("categories") as batch:
        batch.drop_column("is_fixed")
