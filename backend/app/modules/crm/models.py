"""
modules/crm/models.py - CRM-Specific ORM Models.

These models power the four key Sanestix CRM dashboard pages:
  - Developer / Resource Heatmap
  - Project Tracker
  - Revenue Chart (MRR/ARR snapshots)

They are intentionally separate from the generic accounts/leads/tasks
modules to keep CRM concerns isolated.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import (
    DECIMAL,
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base_model import SoftDeleteMixin, TimestampMixin


# ── Enums ──────────────────────────────────────────────────────────────────────

class ProjectStatus(StrEnum):
    KICKOFF     = "kickoff"
    IN_PROGRESS = "in_progress"
    UAT         = "uat"
    DELIVERED   = "delivered"
    ON_HOLD     = "on_hold"


class DealType(StrEnum):
    STAFF_AUGMENTATION = "staff_augmentation"
    FIXED_COST         = "fixed_cost"
    MANAGED_SERVICES   = "managed_services"


# ── Developer ──────────────────────────────────────────────────────────────────

class Developer(Base, TimestampMixin, SoftDeleteMixin):
    """
    A technical resource (developer / designer / QA).
    Skills are stored as a JSON array for flexible tech-stack querying.
    """
    __tablename__ = "developers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    role: Mapped[str] = mapped_column(
        String(100), nullable=False,
        doc="e.g. 'Senior React Developer', 'QA Engineer'"
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    avatar_initials: Mapped[str] = mapped_column(
        String(4), nullable=False, default="DEV",
        doc="2-3 letter initials shown in the heatmap avatar"
    )
    accent_color: Mapped[str] = mapped_column(
        String(20), nullable=False, default="#6366f1",
        doc="Hex accent color for the avatar badge"
    )
    weekly_capacity: Mapped[float] = mapped_column(
        Float, nullable=False, default=40.0,
        doc="Available billable hours per week"
    )
    skills: Mapped[list | None] = mapped_column(
        JSON, nullable=True,
        doc="JSON array of skill tags, e.g. ['React', 'TypeScript', 'GraphQL']"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # user_id links this Developer to a CRM User account (optional)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    allocations: Mapped[list["DeveloperAllocation"]] = relationship(
        "DeveloperAllocation", back_populates="developer", lazy="select",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Developer id={self.id} name={self.name!r} role={self.role!r}>"


# ── DeveloperAllocation ────────────────────────────────────────────────────────

class DeveloperAllocation(Base, TimestampMixin):
    """
    Maps a developer to a project for a specific ISO week.
    Enables the Resource Heatmap: utilisation = hours_allocated / weekly_capacity.
    """
    __tablename__ = "developer_allocations"
    __table_args__ = {"implicit_returning": False}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    developer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("developers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # ISO Monday of the week this allocation covers
    week_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    hours_allocated: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0,
        doc="Planned billable hours for this developer this week"
    )

    # Relationships
    developer: Mapped["Developer"] = relationship(
        "Developer", back_populates="allocations", lazy="joined"
    )
    project: Mapped["Project"] = relationship(
        "Project", back_populates="allocations", lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<DeveloperAllocation dev={self.developer_id} "
            f"proj={self.project_id} week={self.week_start}>"
        )


# ── Project ────────────────────────────────────────────────────────────────────

class Project(Base, TimestampMixin, SoftDeleteMixin):
    """
    A delivered or active software project.
    Spawned when an Opportunity is Closed Won. Tracks budget, hours, velocity.
    """
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=ProjectStatus.IN_PROGRESS, index=True
    )
    deal_type: Mapped[str] = mapped_column(
        String(40), nullable=False, default=DealType.FIXED_COST
    )

    # Financial
    budget: Mapped[float | None] = mapped_column(DECIMAL(18, 4), nullable=True)
    monthly_retainer: Mapped[float | None] = mapped_column(
        DECIMAL(18, 4), nullable=True,
        doc="Non-null for Managed Services / retainer engagements"
    )

    # Timeline
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Velocity tracking
    estimated_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    burned_hours: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)
    velocity_estimated: Mapped[int | None] = mapped_column(
        Integer, nullable=True, doc="Story points per sprint at proposal time"
    )
    velocity_actual: Mapped[int | None] = mapped_column(
        Integer, nullable=True, doc="Actual average story points per sprint"
    )

    tech_stack: Mapped[list | None] = mapped_column(
        JSON, nullable=True, doc="JSON array of tech tags used on the project"
    )

    # FK to accounts and opportunities
    account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    opportunity_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("opportunities.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    allocations: Mapped[list["DeveloperAllocation"]] = relationship(
        "DeveloperAllocation", back_populates="project", lazy="select",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Project id={self.id} name={self.name!r} status={self.status!r}>"


# ── RevenuePoint ───────────────────────────────────────────────────────────────

class RevenuePoint(Base, TimestampMixin):
    """
    Monthly financial snapshot used for the MRR/ARR/Pipeline chart.
    One row per month, created by a scheduled job or manually via the admin seed.
    """
    __tablename__ = "revenue_points"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # e.g. "Jan 2025" — human-readable label for the chart x-axis
    month_label: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    # ISO first day of the month for precise ordering
    month_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True, index=True)

    mrr: Mapped[float] = mapped_column(
        DECIMAL(18, 4), nullable=False, default=0.0,
        doc="Monthly Recurring Revenue in USD"
    )
    arr: Mapped[float] = mapped_column(
        DECIMAL(18, 4), nullable=False, default=0.0,
        doc="Annual Recurring Revenue (MRR × 12)"
    )
    pipeline: Mapped[float] = mapped_column(
        DECIMAL(18, 4), nullable=False, default=0.0,
        doc="Total weighted pipeline value for this month"
    )

    def __repr__(self) -> str:
        return f"<RevenuePoint month={self.month_label!r} mrr={self.mrr}>"
