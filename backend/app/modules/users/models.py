"""
users/models.py - User ORM Model.

Represents a CRM system user. Stores credentials, role, and team hierarchy.
Linked as the owner/creator of leads, tasks, and opportunities.
"""

from __future__ import annotations

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base_model import SoftDeleteMixin, TimestampMixin
from app.core.rbac import UserRole


class User(Base, TimestampMixin, SoftDeleteMixin):
    """
    Represents a CRM user (Sales Rep, PM, Developer, Admin, or Client contact).
    """
    __tablename__ = "users"

    # ── Primary Key ────────────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # ── Identity ───────────────────────────────────────────────────────────────
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # ── Authorization ──────────────────────────────────────────────────────────
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=UserRole.SALES,
        doc="One of: admin, sales, pm, dev, client",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )

    # ── Team Hierarchy (self-referential) ──────────────────────────────────────
    manager_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        doc="FK to users.id — the user's direct manager.",
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    # Leads assigned to this user
    leads: Mapped[list["Lead"]] = relationship(  # noqa: F821
        "Lead",
        back_populates="owner",
        lazy="select",
    )
    # Tasks created by this user
    tasks: Mapped[list["Task"]] = relationship(  # noqa: F821
        "Task",
        back_populates="assigned_to",
        foreign_keys="Task.assigned_to_id",
        lazy="select",
    )

    # ── Repr ──────────────────────────────────────────────────────────────────
    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role!r}>"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
