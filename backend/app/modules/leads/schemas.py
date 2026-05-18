"""
leads/schemas.py - Pydantic Schemas for the Lead Module.

Follows the Create / Update / Read (CUR) pattern:
  - LeadCreate : payload for POST (all required fields, no ID)
  - LeadUpdate : payload for PATCH (all fields optional)
  - LeadRead   : full read representation returned by the API

All schemas use strict validators and provide Swagger-friendly examples.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    HttpUrl,
    field_validator,
)

from app.modules.leads.models import DealType, LeadSource, LeadStatus


# ── Shared Field Definitions ───────────────────────────────────────────────────
_EmailField = Annotated[EmailStr, Field(description="Prospect's email address")]
_PhoneField = Annotated[
    str | None,
    Field(default=None, max_length=30, description="Phone number with country code"),
]
_ValueField = Annotated[
    Decimal | None,
    Field(
        default=None,
        ge=0,
        decimal_places=4,
        description="Estimated deal value in USD",
        examples=[50000.0000],
    ),
]


# ── Base Schema (shared field declarations) ────────────────────────────────────
class LeadBase(BaseModel):
    first_name: str = Field(
        ..., min_length=1, max_length=100, description="Prospect's first name"
    )
    last_name: str = Field(
        ..., min_length=1, max_length=100, description="Prospect's last name"
    )
    email: _EmailField
    phone: _PhoneField = None
    company_name: str | None = Field(
        default=None, max_length=255, description="Company or organization"
    )
    job_title: str | None = Field(
        default=None, max_length=150, description="Prospect's role"
    )
    linkedin_url: str | None = Field(
        default=None, max_length=500, description="LinkedIn profile URL"
    )
    deal_type: DealType = Field(
        default=DealType.FIXED_COST_PROJECT,
        description="Nature of the potential engagement",
    )
    estimated_value: _ValueField = None
    tech_stack_requirements: str | None = Field(
        default=None,
        description="Technical requirements (e.g., 'Senior React Dev + FastAPI')",
    )
    source: LeadSource = Field(
        default=LeadSource.WEBSITE,
        description="Lead acquisition channel",
    )
    notes: str | None = Field(
        default=None, description="Sales notes and call summaries"
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        """Basic E.164-format sanity check (not a full regex for brevity)."""
        if v and not v.startswith("+"):
            raise ValueError("Phone number must include country code (e.g., +92...)")
        return v


# ── Create Schema ──────────────────────────────────────────────────────────────
class LeadCreate(LeadBase):
    """
    Payload for POST /api/v1/leads.
    owner_id is set server-side from the authenticated user — not provided by the client.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "first_name": "Aisha",
                "last_name": "Khan",
                "email": "aisha.khan@techcorp.pk",
                "phone": "+923001234567",
                "company_name": "TechCorp Pakistan",
                "job_title": "CTO",
                "deal_type": "fixed_cost_project",
                "estimated_value": 75000.0000,
                "tech_stack_requirements": "Senior React Developer + FastAPI Backend",
                "source": "linkedin",
                "notes": "Met at DevFest 2025. Very interested in our web platform.",
            }
        }
    )


# ── Update Schema ──────────────────────────────────────────────────────────────
class LeadUpdate(BaseModel):
    """
    Payload for PATCH /api/v1/leads/{id}.
    Every field is optional — only provided fields are updated.
    """

    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: _PhoneField = None
    company_name: str | None = Field(default=None, max_length=255)
    job_title: str | None = Field(default=None, max_length=150)
    linkedin_url: str | None = Field(default=None, max_length=500)
    deal_type: DealType | None = None
    estimated_value: _ValueField = None
    tech_stack_requirements: str | None = None
    status: LeadStatus | None = None
    source: LeadSource | None = None
    notes: str | None = None
    owner_id: int | None = Field(
        default=None, description="Re-assign lead to another sales rep (Admin only)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "qualified",
                "estimated_value": 90000.0000,
                "notes": "Upgraded estimate after discovery call.",
            }
        }
    )


# ── Nested Owner Schema ────────────────────────────────────────────────────────
class OwnerRead(BaseModel):
    """Compact user representation embedded inside LeadRead."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str


# ── Read Schema ────────────────────────────────────────────────────────────────
class LeadRead(LeadBase):
    """
    Full representation returned by GET endpoints.
    from_attributes=True enables mapping from SQLAlchemy ORM instances.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    status: LeadStatus
    owner_id: int
    owner: OwnerRead
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


# ── List Response ──────────────────────────────────────────────────────────────
class LeadListItem(BaseModel):
    """
    Slim projection for paginated list responses.
    Only loads the fields needed for table/kanban views.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str
    company_name: str | None
    deal_type: DealType
    estimated_value: Decimal | None
    status: LeadStatus
    source: LeadSource
    owner_id: int
    created_at: datetime
