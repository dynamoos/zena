"""Add case-level fields and report template design_json

Revision ID: 002_case_fields
Revises: c248d10c8554
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa

revision = "002_case_fields"
down_revision = "c248d10c8554"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cases", sa.Column("file_number", sa.String(100), nullable=True))
    op.add_column("cases", sa.Column("court", sa.String(255), nullable=True))
    op.add_column("cases", sa.Column("court_location", sa.String(255), nullable=True))
    op.add_column(
        "cases",
        sa.Column("case_status", sa.String(50), server_default="ACTIVO", nullable=False),
    )
    op.add_column(
        "report_templates", sa.Column("design_json", sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("report_templates", "design_json")
    op.drop_column("cases", "case_status")
    op.drop_column("cases", "court_location")
    op.drop_column("cases", "court")
    op.drop_column("cases", "file_number")
