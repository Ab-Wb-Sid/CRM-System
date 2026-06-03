"""allow_unassigned_tasks_and_in_review

Revision ID: 9c3f21a6b8d4
Revises: 4b7c2f7d9a21
Create Date: 2026-05-19 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9c3f21a6b8d4"
down_revision: Union[str, Sequence[str], None] = "4b7c2f7d9a21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "tasks",
        "assigned_to_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE tasks
        SET assigned_to_id = created_by_id
        WHERE assigned_to_id IS NULL
        """
    )
    op.alter_column(
        "tasks",
        "assigned_to_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
