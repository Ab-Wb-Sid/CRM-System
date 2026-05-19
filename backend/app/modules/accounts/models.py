"""
accounts/models.py - Account and Opportunity ORM Models.
"""

from __future__ import annotations
from enum import StrEnum
from sqlalchemy import DECIMAL, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base_model import SoftDeleteMixin, TimestampMixin


class OpportunityStage(StrEnum):
    DISCOVERY = "discovery"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class Account(Base, TimestampMixin, SoftDeleteMixin):
    """A qualified client company. Created when a Lead is converted."""
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    annual_revenue: Mapped[float | None] = mapped_column(DECIMAL(18, 4), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False
    )
    opportunities: Mapped[list["Opportunity"]] = relationship(
        "Opportunity", back_populates="account", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Account id={self.id} name={self.company_name!r}>"


class Opportunity(Base, TimestampMixin, SoftDeleteMixin):
    """A deal being tracked through the sales pipeline."""
    __tablename__ = "opportunities"
    __table_args__ = {"implicit_returning": False}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    stage: Mapped[str] = mapped_column(
        String(30), nullable=False, default=OpportunityStage.DISCOVERY, index=True
    )
    deal_value: Mapped[float | None] = mapped_column(DECIMAL(18, 4), nullable=True)
    probability: Mapped[int | None] = mapped_column(
        Integer, nullable=True, doc="Win probability % (0-100)"
    )
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    account: Mapped[Account] = relationship("Account", back_populates="opportunities")
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False
    )
