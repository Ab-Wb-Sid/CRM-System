"""
base_model.py - Shared SQLAlchemy ORM Base Mixin.

All CRM models inherit TimestampMixin and SoftDeleteMixin to get:
  - Automatic created_at / updated_at timestamps.
  - Soft-delete support (records are never physically deleted in a CRM).
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import func


class TimestampMixin:
    """Automatically maintains created_at and updated_at columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="UTC timestamp when the record was created.",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="UTC timestamp of the last update.",
    )


class SoftDeleteMixin:
    """
    Soft-delete support. CRM records should never be hard-deleted — they
    are archived to preserve audit trails and reporting history.
    """

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
        doc="Soft-delete flag. True = record is archived.",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="UTC timestamp when the record was soft-deleted.",
    )

    def soft_delete(self) -> None:
        """Mark the record as deleted without removing it from the database."""
        self.is_deleted = True
        self.deleted_at = datetime.now(timezone.utc)
