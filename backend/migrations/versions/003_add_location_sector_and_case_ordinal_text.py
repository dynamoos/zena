"""Add location sector and case ordinal_text fields

Revision ID: 003_sector_ordinal
Revises: 002_case_fields
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa

revision = "003_sector_ordinal"
down_revision = "002_case_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("locations", sa.Column("sector", sa.String(100), nullable=True))
    op.add_column("cases", sa.Column("ordinal_text", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("cases", "ordinal_text")
    op.drop_column("locations", "sector")
