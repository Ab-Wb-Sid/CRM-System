"""
leads/models.py - Lead ORM Model.

A Lead represents a prospective client or deal at the earliest stage of
the sales pipeline. When qualified, a Lead is converted into an Account
and an Opportunity.

MSSQL-specific notes:
  - NVARCHAR is used for all text columns to support Unicode characters.
  - DECIMAL(18, 4) is used for monetary values to avoid float imprecision.
  - interaction_history is stored as NVARCHAR(MAX) with JSON convention
    for flexibility; a dedicated InteractionHistory table is recommended
    for high-volume production systems.
"""

from __future__ import annotations

from enum import StrEnum

from sqlalchemy import (
    DECIMAL,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base_model import SoftDeleteMixin, TimestampMixin


# ── Enumerations ───────────────────────────────────────────────────────────────
class LeadStatus(StrEnum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL_SENT = "proposal_sent"
    NEGOTIATION = "negotiation"
    CONVERTED = "converted"
    LOST = "lost"
    DISQUALIFIED = "disqualified"


class LeadSource(StrEnum):
    WEBSITE = "website"
    REFERRAL = "referral"
    LINKEDIN = "linkedin"
    COLD_OUTREACH = "cold_outreach"
    EVENT = "event"
    PARTNER = "partner"
    INBOUND_CALL = "inbound_call"
    OTHER = "other"


class DealType(StrEnum):
    """Software-house-specific deal classification."""
    STAFF_AUGMENTATION = "staff_augmentation"
    FIXED_COST_PROJECT = "fixed_cost_project"
    MANAGED_SERVICES = "managed_services"
    SAAS_LICENSE = "saas_license"
    CONSULTING = "consulting"


# ── ORM Model ─────────────────────────────────────────────────────────────────
class Lead(Base, TimestampMixin, SoftDeleteMixin):
    """
    A prospect in the earliest stage of the CRM sales funnel.
    Tracks contact details, estimated deal value, and status progression.
    """
    __tablename__ = "leads"

    # ── Primary Key ────────────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # ── Contact Information ────────────────────────────────────────────────────
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(150), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Deal Classification (Software-House Specific) ──────────────────────────
    deal_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=DealType.FIXED_COST_PROJECT,
        doc="Classifies the nature of the potential engagement.",
    )
    estimated_value: Mapped[float | None] = mapped_column(
        DECIMAL(18, 4),
        nullable=True,
        doc="Estimated deal value in USD. DECIMAL(18,4) for billing precision.",
    )
    tech_stack_requirements: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Free-text or JSON describing technical requirements (e.g., 'React, FastAPI').",
    )

    # ── Pipeline Status ────────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=LeadStatus.NEW,
        index=True,
        doc="Current stage of the lead in the pipeline.",
    )
    source: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=LeadSource.WEBSITE,
        doc="Channel through which the lead was acquired.",
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Sales rep notes and call summaries.",
    )

    # ── Ownership ──────────────────────────────────────────────────────────────
    owner_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="NO ACTION"),
        nullable=False,
        index=True,
        doc="Sales rep responsible for this lead.",
    )
    owner: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="leads",
        lazy="joined",  # Always JOIN-load the owner to avoid N+1
    )

    # ── Repr ──────────────────────────────────────────────────────────────────
    def __repr__(self) -> str:
        return (
            f"<Lead id={self.id} email={self.email!r} status={self.status!r}>"
        )
