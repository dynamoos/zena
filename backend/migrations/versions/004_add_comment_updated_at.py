"""Add updated_at to comments table

Revision ID: 004_comment_updated_at
Revises: 003_sector_ordinal
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa

revision = "004_comment_updated_at"
down_revision = "003_sector_ordinal"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "comments",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("comments", "updated_at")
