"""
tasks/models.py - Task & Activity ORM Model.
"""

from __future__ import annotations
from datetime import datetime
from enum import StrEnum
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base_model import SoftDeleteMixin, TimestampMixin


class TaskType(StrEnum):
    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    FOLLOW_UP = "follow_up"
    DEMO = "demo"
    OTHER = "other"


class TaskStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Task(Base, TimestampMixin, SoftDeleteMixin):
    """Represents a scheduled or logged CRM activity (call, email, meeting)."""
    __tablename__ = "tasks"
    __table_args__ = {"implicit_returning": False}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default=TaskType.FOLLOW_UP
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=TaskStatus.PENDING, index=True
    )
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Polymorphic association: task can be linked to a Lead or Opportunity
    lead_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True
    )
    opportunity_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("opportunities.id", ondelete="SET NULL"), nullable=True
    )
    project_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )

    assigned_to_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True
    )
    assigned_to: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        back_populates="tasks",
        foreign_keys=[assigned_to_id],
        lazy="joined",
    )
    created_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Task id={self.id} title={self.title!r} status={self.status!r}>"
