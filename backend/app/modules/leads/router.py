"""
leads/router.py - Lead API Router.

All endpoints are versioned under /api/v1/leads.
Each endpoint documents:
  - summary        : short description shown in Swagger
  - response_model : the Pydantic schema for the success response
  - responses      : explicit non-200 HTTP codes for Swagger documentation
  - tags           : groups endpoint in the Swagger UI sidebar
  - dependencies   : RBAC guards applied at the decorator level
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.pagination import PagedResponse, PaginationParams
from app.core.rbac import UserRole, require_min_role, require_roles
from app.core.security import get_current_user
from app.database import get_db
from app.modules.leads.models import LeadStatus
from app.modules.leads.schemas import LeadCreate, LeadListItem, LeadRead, LeadUpdate
from app.modules.leads.service import LeadService
from app.modules.users.models import User

router = APIRouter(
    prefix="/leads",
    tags=["Leads & Contact Management"],
)

# ── Common Error Response Docs ─────────────────────────────────────────────────
_NOT_FOUND = {404: {"description": "Lead not found"}}
_FORBIDDEN = {403: {"description": "Insufficient permissions"}}
_CONFLICT = {409: {"description": "Resource conflict (e.g., duplicate email)"}}
_UNAUTHORIZED = {401: {"description": "Missing or invalid authentication token"}}


# ── POST /leads ────────────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=LeadRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new lead",
    response_description="The newly created lead with all fields populated.",
    responses={**_CONFLICT, **_UNAUTHORIZED},
    dependencies=[Depends(require_roles(UserRole.SALES, UserRole.ADMIN))],
)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadRead:
    """
    Creates a new prospect lead. The authenticated sales rep is automatically
    set as the owner. Raises **409 Conflict** if the email already exists.
    """
    return LeadService(db).create_lead(payload, current_user)


# ── GET /leads ─────────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=PagedResponse[LeadListItem],
    summary="List all leads (paginated)",
    response_description="Paginated list of leads. Sales reps see only their own.",
    responses={**_UNAUTHORIZED},
)
def list_leads(
    params: PaginationParams = Depends(),
    status_filter: LeadStatus | None = Query(
        default=None, alias="status", description="Filter by lead pipeline status"
    ),
    search: str | None = Query(
        default=None, description="Search by name, email, or company"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PagedResponse[LeadListItem]:
    """
    Returns a paginated list of leads. Applies role-based scoping automatically:
    - **Sales reps** see only leads assigned to them.
    - **PMs and Admins** see all leads across the organization.
    """
    return LeadService(db).list_leads(params, current_user, status_filter, search)


# ── GET /leads/{id} ────────────────────────────────────────────────────────────
@router.get(
    "/{lead_id}",
    response_model=LeadRead,
    summary="Get a single lead by ID",
    response_description="Full lead detail including owner information.",
    responses={**_NOT_FOUND, **_UNAUTHORIZED, **_FORBIDDEN},
)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadRead:
    """
    Fetches a single lead. Returns **404** if the lead does not exist or
    has been archived.
    """
    return LeadService(db).get_lead(lead_id, current_user)


# ── PATCH /leads/{id} ─────────────────────────────────────────────────────────
@router.patch(
    "/{lead_id}",
    response_model=LeadRead,
    summary="Partially update a lead",
    response_description="The updated lead record.",
    responses={**_NOT_FOUND, **_FORBIDDEN, **_UNAUTHORIZED},
)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadRead:
    """
    Partially updates a lead using a **PATCH** (not PUT) strategy — only
    provided fields are written. The owner or an Admin may update.
    Only Admins may reassign a lead to a different sales rep.
    """
    return LeadService(db).update_lead(lead_id, payload, current_user)


# ── DELETE /leads/{id} ────────────────────────────────────────────────────────
@router.delete(
    "/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Archive (soft-delete) a lead",
    responses={**_NOT_FOUND, **_FORBIDDEN, **_UNAUTHORIZED},
)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    **Archives** the lead — this is a soft-delete. The record is preserved in
    the database for audit trail and reporting purposes. Returns **204 No Content**.
    """
    LeadService(db).delete_lead(lead_id, current_user)


# ── POST /leads/{id}/convert ──────────────────────────────────────────────────
@router.post(
    "/{lead_id}/convert",
    response_model=LeadRead,
    summary="Convert a lead into an Account & Opportunity",
    response_description="The lead marked as CONVERTED.",
    responses={**_NOT_FOUND, **_CONFLICT, **_FORBIDDEN, **_UNAUTHORIZED},
    dependencies=[Depends(require_roles(UserRole.SALES, UserRole.ADMIN))],
)
def convert_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadRead:
    """
    Marks a qualified lead as **CONVERTED**. This action transitions the
    lead into the Account & Opportunity pipeline. Returns **409** if the lead
    has already been converted.
    """
    return LeadService(db).convert_lead(lead_id, current_user)
