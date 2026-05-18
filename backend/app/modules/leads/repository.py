"""
leads/repository.py - Lead Data Access Layer.

Responsibilities (Repository Pattern):
  - All direct SQLAlchemy ORM operations live here.
  - No business logic — only database reads and writes.
  - Returns ORM model instances (the Service layer handles transformation).
  - All write operations flush but do NOT commit — commit is the caller's job
    (Unit of Work boundary sits in the Service or Router).
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.leads.models import Lead, LeadStatus
from app.modules.leads.schemas import LeadCreate, LeadUpdate


class LeadRepository:
    """Data access object for the Lead entity."""

    def __init__(self, db: Session) -> None:
        self._db = db

    # ── Read Operations ────────────────────────────────────────────────────────
    def get_by_id(self, lead_id: int) -> Lead | None:
        """Fetch a single active (non-deleted) lead by primary key."""
        stmt = (
            select(Lead)
            .where(Lead.id == lead_id, Lead.is_deleted == False)  # noqa: E712
        )
        return self._db.scalar(stmt)

    def get_by_email(self, email: str) -> Lead | None:
        """Check for email uniqueness before creating a new lead."""
        stmt = select(Lead).where(Lead.email == email, Lead.is_deleted == False)  # noqa: E712
        return self._db.scalar(stmt)

    def list_all(
        self,
        offset: int = 0,
        limit: int = 20,
        status: LeadStatus | None = None,
        owner_id: int | None = None,
        search: str | None = None,
    ) -> tuple[list[Lead], int]:
        """
        Returns a paginated list of leads with optional filters.
        Uses two queries: one for the data slice, one for the total count.
        Returns (items, total_count) as a tuple.
        """
        base_stmt = select(Lead).where(Lead.is_deleted == False)  # noqa: E712

        # ── Filters ───────────────────────────────────────────────────────────
        if status:
            base_stmt = base_stmt.where(Lead.status == status)
        if owner_id:
            base_stmt = base_stmt.where(Lead.owner_id == owner_id)
        if search:
            term = f"%{search.lower()}%"
            base_stmt = base_stmt.where(
                func.lower(Lead.first_name).like(term)
                | func.lower(Lead.last_name).like(term)
                | func.lower(Lead.email).like(term)
                | func.lower(Lead.company_name).like(term)
            )

        # ── Count total (without OFFSET/LIMIT) ────────────────────────────────
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total: int = self._db.scalar(count_stmt) or 0

        # ── Paginated slice ───────────────────────────────────────────────────
        data_stmt = (
            base_stmt
            .order_by(Lead.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        items = list(self._db.scalars(data_stmt).all())

        return items, total

    # ── Write Operations ───────────────────────────────────────────────────────
    def create(self, payload: LeadCreate, owner_id: int) -> Lead:
        """
        Persists a new lead. Does NOT commit — caller controls the transaction.
        """
        lead = Lead(**payload.model_dump(), owner_id=owner_id)
        self._db.add(lead)
        self._db.flush()   # Populates lead.id before commit
        self._db.refresh(lead)
        return lead

    def update(self, lead: Lead, payload: LeadUpdate) -> Lead:
        """
        Applies a partial PATCH update. Only non-None fields are written.
        """
        update_data = payload.model_dump(exclude_none=True)
        for field, value in update_data.items():
            setattr(lead, field, value)
        self._db.flush()
        self._db.refresh(lead)
        return lead

    def soft_delete(self, lead: Lead) -> None:
        """
        Archives the lead. The record is never physically removed.
        """
        lead.soft_delete()
        self._db.flush()
