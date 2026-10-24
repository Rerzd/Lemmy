"""add external_cache

Cache for data fetched from external sources (the TRM from datos.gov.co and exchange
rates), so the API hits them rarely and can serve the last good value during an outage.
A plain new table: nothing to rebuild, so it's safe on SQLite.

Revision ID: 0003_external_cache
Revises: 0002_category_is_fixed
Create Date: 2026-10-24 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0003_external_cache"
down_revision: Union[str, None] = "0002_category_is_fixed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "external_cache",
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_for", sa.Date(), nullable=True),
        sa.PrimaryKeyConstraint("key"),
    )


def downgrade() -> None:
    op.drop_table("external_cache")
