"""
leads/service.py - Lead Business Logic Layer.

Responsibilities (Service Pattern):
  - Enforces business rules (e.g., duplicate email check, ownership validation).
  - Orchestrates repository calls within a single transaction.
  - Commits the database session — this is the Unit of Work boundary.
  - Returns Pydantic schemas, NOT ORM models, to the Router layer.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.core.pagination import PagedResponse, PaginationParams
from app.core.rbac import UserRole
from app.modules.leads.models import Lead, LeadStatus
from app.modules.leads.repository import LeadRepository
from app.modules.leads.schemas import LeadCreate, LeadListItem, LeadRead, LeadUpdate
from app.modules.users.models import User


class LeadService:
    """
    Orchestrates all lead-related business operations.
    Always committed in one method — never leaves the DB in a partial state.
    """

    def __init__(self, db: Session) -> None:
        self._db = db
        self._repo = LeadRepository(db)

    # ── Internal Helpers ───────────────────────────────────────────────────────
    def _get_lead_or_404(self, lead_id: int) -> Lead:
        lead = self._repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundException(f"Lead with ID {lead_id} not found.")
        return lead

    def _assert_ownership_or_admin(self, lead: Lead, current_user: User) -> None:
        """
        Raises ForbiddenException if the requesting user is not the lead's
        owner and is not an Admin.
        """
        if current_user.role != UserRole.ADMIN and lead.owner_id != current_user.id:
            raise ForbiddenException(
                "You can only modify leads assigned to you."
            )

    # ── Business Operations ────────────────────────────────────────────────────
    def create_lead(self, payload: LeadCreate, current_user: User) -> LeadRead:
        """
        Creates a new lead. The authenticated sales rep becomes the owner.
        Raises ConflictException if a lead with the same email already exists.
        """
        existing = self._repo.get_by_email(payload.email)
        if existing:
            raise ConflictException(
                f"A lead with email '{payload.email}' already exists (ID: {existing.id})."
            )

        lead = self._repo.create(payload, owner_id=current_user.id)
        self._db.commit()
        return LeadRead.model_validate(lead)

    def get_lead(self, lead_id: int, current_user: User) -> LeadRead:
        """
        Fetches a single lead. Clients can only view leads linked to their account.
        All internal roles (Sales, PM, Admin) can view all leads.
        """
        lead = self._get_lead_or_404(lead_id)

        if current_user.role == UserRole.CLIENT:
            # Clients must not see other companies' leads
            raise ForbiddenException("Access to this resource is restricted.")

        return LeadRead.model_validate(lead)

    def list_leads(
        self,
        params: PaginationParams,
        current_user: User,
        status: LeadStatus | None = None,
        search: str | None = None,
    ) -> PagedResponse[LeadListItem]:
        """
        Returns a paginated list of leads.
        Sales reps only see their own leads; Admins and PMs see all.
        """
        owner_filter: int | None = None
        if current_user.role == UserRole.SALES:
            owner_filter = current_user.id  # Scoped to own portfolio

        items, total = self._repo.list_all(
            offset=params.offset,
            limit=params.limit,
            status=status,
            owner_id=owner_filter,
            search=search,
        )

        serialized = [LeadListItem.model_validate(lead) for lead in items]
        return PagedResponse.create(items=serialized, total=total, params=params)

    def update_lead(
        self, lead_id: int, payload: LeadUpdate, current_user: User
    ) -> LeadRead:
        """
        Partially updates a lead. Validates ownership before allowing mutation.
        Only Admins can reassign a lead to a different owner.
        """
        lead = self._get_lead_or_404(lead_id)
        self._assert_ownership_or_admin(lead, current_user)

        if payload.owner_id and current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Only Admins can reassign a lead.")

        updated = self._repo.update(lead, payload)
        self._db.commit()
        return LeadRead.model_validate(updated)

    def delete_lead(self, lead_id: int, current_user: User) -> None:
        """
        Soft-deletes a lead. Non-destructive — the record is archived, not removed.
        Only the owner or an Admin may delete a lead.
        """
        lead = self._get_lead_or_404(lead_id)
        self._assert_ownership_or_admin(lead, current_user)
        self._repo.soft_delete(lead)
        self._db.commit()

    def convert_lead(self, lead_id: int, current_user: User) -> LeadRead:
        """
        Marks a lead as CONVERTED. In a full implementation, this would
        atomically create an Account and Opportunity record.
        """
        lead = self._get_lead_or_404(lead_id)
        self._assert_ownership_or_admin(lead, current_user)

        if lead.status == LeadStatus.CONVERTED:
            raise ConflictException(f"Lead {lead_id} has already been converted.")

        lead.status = LeadStatus.CONVERTED
        self._db.flush()
        self._db.commit()
        return LeadRead.model_validate(lead)
