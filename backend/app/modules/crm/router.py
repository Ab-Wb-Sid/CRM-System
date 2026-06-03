"""
modules/crm/router.py - CRM Dashboard API Endpoints.

All routes are mounted under /api/v1/crm and require a valid JWT Bearer token.
These endpoints power the five Sanestix CRM frontend pages:
  Dashboard   → /dashboard + /revenue
  Pipeline    → /opportunities + /opportunities/{id}/stage
  Resources   → /developers + /heatmap
  Tasks       → /tasks + /tasks/{id}
"""

from __future__ import annotations

import secrets
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, hash_password
from app.core.exceptions import BadRequestException, NotFoundException
from app.database import get_db
from app.modules.accounts.models import Account, Opportunity, OpportunityStage
from app.modules.crm.models import Developer, DeveloperAllocation, Project, RevenuePoint
from app.modules.tasks.models import Task, TaskStatus
from app.modules.users.models import User

router = APIRouter(tags=["CRM"])


class OpportunityCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    client_name: str = Field(min_length=1, max_length=255)
    expected_value: float = Field(default=0, ge=0)
    probability: int = Field(default=25, ge=0, le=100)
    stage: str = "Lead"


class OpportunityUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    client_name: str | None = Field(default=None, min_length=1, max_length=255)
    expected_value: float | None = Field(default=None, ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    stage: str | None = None


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: str = "Backlog"
    task_type: str = "follow_up"
    due_date: datetime | None = None
    project_id: int | None = None
    opportunity_id: int | None = None
    lead_id: int | None = None
    assigned_to_id: int | None = None
    assigned_to_developer_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = None
    due_date: datetime | None = None
    project_id: int | None = None
    assigned_to_id: int | None = None
    assigned_to_developer_id: int | None = None


class DeveloperCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    role: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    weekly_capacity: float = Field(default=40, gt=0, le=168)
    skills: list[str] = Field(default_factory=list)


class DeveloperUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    role: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = Field(default=None, min_length=3, max_length=255)
    weekly_capacity: float | None = Field(default=None, gt=0, le=168)
    skills: list[str] | None = None


# ── Helper ─────────────────────────────────────────────────────────────────────

def _require_auth(current_user: User = Depends(get_current_user)) -> User:
    """Convenience shorthand used in every endpoint."""
    return current_user


def _opportunity_to_dict(opp: Opportunity, db: Session) -> dict[str, Any]:
    account: Account | None = db.get(Account, opp.account_id)
    return {
        "id": str(opp.id),
        "clientId": str(opp.account_id),
        "clientName": account.company_name if account else "Unknown",
        "title": opp.name,
        "dealType": "Fixed-Cost",
        "stage": _map_stage(opp.stage),
        "expectedValue": float(opp.deal_value or 0),
        "probability": opp.probability or 0,
        "assignedPM": "Unassigned",
        "pmAvatar": "",
        "techStack": [],
        "estimatedCloseDate": "",
        "lastActivityDate": opp.updated_at.isoformat() if opp.updated_at else "",
    }


def _task_to_dict(task: Task, db: Session) -> dict[str, Any]:
    assignee_id = ""
    assignee_name = ""
    if task.assigned_to_id:
        developer = db.scalar(
            select(Developer).where(
                Developer.user_id == task.assigned_to_id,
                Developer.is_deleted == False,  # noqa: E712
            )
        )
        if developer:
            assignee_id = str(developer.id)
            assignee_name = developer.name
    project: Project | None = None
    if getattr(task, "project_id", None):
        project = db.get(Project, task.project_id)
    if project is None and task.opportunity_id:
        project = db.scalar(
            select(Project).where(
                Project.opportunity_id == task.opportunity_id,
                Project.is_deleted == False,  # noqa: E712
            )
        )
    return {
        "id": str(task.id),
        "projectId": str(project.id if project else ""),
        "projectName": project.name if project else "",
        "title": task.title,
        "assigneeId": assignee_id,
        "assigneeName": assignee_name,
        "status": _map_task_status(task.status),
        "priority": "Medium",
        "storyPoints": 0,
        "dueDate": task.due_date.isoformat() if task.due_date else "",
        "epic": "",
        "sprint": "",
        "techStack": [],
        "createdAt": task.created_at.isoformat() if task.created_at else "",
    }


def _developer_to_dict(dev: Developer) -> dict[str, Any]:
    allocations = [
        {
            "projectId": str(a.project_id),
            "projectName": a.project.name if a.project else "",
            "weekStart": a.week_start.isoformat(),
            "hoursAllocated": a.hours_allocated,
        }
        for a in dev.allocations
    ]
    return {
        "id": str(dev.id),
        "userId": str(dev.user_id or ""),
        "name": dev.name,
        "role": dev.role,
        "email": dev.email,
        "avatar": dev.avatar_initials,
        "skills": dev.skills or [],
        "weeklyCapacity": dev.weekly_capacity,
        "allocations": allocations,
    }


def _initials(name: str) -> str:
    return "".join(part[0] for part in name.split() if part).upper()[:3] or "DEV"


def _split_name(name: str) -> tuple[str, str]:
    parts = name.strip().split()
    if not parts:
        return "Resource", "User"
    if len(parts) == 1:
        return parts[0], "Resource"
    return parts[0], " ".join(parts[1:])


def _ensure_developer_user(dev: Developer, db: Session) -> int:
    if dev.user_id and db.get(User, dev.user_id):
        return dev.user_id

    user = db.scalar(select(User).where(User.email == dev.email, User.is_deleted == False))  # noqa: E712
    if user is None:
        first_name, last_name = _split_name(dev.name)
        user = User(
            first_name=first_name,
            last_name=last_name,
            email=dev.email,
            hashed_password=hash_password(secrets.token_urlsafe(24)),
            role="dev",
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            is_deleted=False,
        )
        db.add(user)
        db.flush()

    dev.user_id = user.id
    dev.updated_at = datetime.now(timezone.utc)
    db.flush()
    return user.id


def _developer_for_user_id(user_id: int | None, db: Session) -> Developer | None:
    if user_id is None:
        return None
    return db.scalar(
        select(Developer).where(
            Developer.user_id == user_id,
            Developer.is_active == True,  # noqa: E712
            Developer.is_deleted == False,  # noqa: E712
        )
    )


def _project_to_dict(project: Project) -> dict[str, Any]:
    return {
        "id": str(project.id),
        "clientId": str(project.account_id or ""),
        "clientName": "",
        "opportunityId": str(project.opportunity_id or ""),
        "name": project.name,
        "status": project.status,
        "startDate": project.start_date.isoformat() if project.start_date else "",
        "endDate": project.end_date.isoformat() if project.end_date else "",
        "budget": float(project.budget or 0),
        "burnedHours": float(project.burned_hours or 0),
        "estimatedHours": float(project.estimated_hours or 0),
        "velocityActual": project.velocity_actual or 0,
        "velocityEstimated": project.velocity_estimated or 0,
        "techStack": project.tech_stack or [],
    }


# ══════════════════════════════════════════════════════════════════════════════
#  DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/dashboard",
    summary="CRM KPI Dashboard Stats",
    response_description="Aggregated KPIs for the main dashboard",
)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> dict[str, Any]:
    """
    Returns:
    - mrr, arr (from the latest RevenuePoint row)
    - mrr_growth % vs. previous month
    - active_projects count
    - open_deals count + weighted pipeline value
    - developer_utilization % (avg across all active devs)
    - team_size (active developer count)
    """
    # --- MRR / ARR from the latest revenue snapshot ---
    latest_rev: RevenuePoint | None = db.scalar(
        select(RevenuePoint).order_by(RevenuePoint.month_date.desc()).limit(1)
    )
    mrr = float(latest_rev.mrr) if latest_rev else 0.0
    arr = float(latest_rev.arr) if latest_rev else 0.0

    # MRR growth: compare to month before latest
    prev_rev: RevenuePoint | None = db.scalar(
        select(RevenuePoint).order_by(RevenuePoint.month_date.desc()).offset(1).limit(1)
    )
    if prev_rev and float(prev_rev.mrr) > 0:
        mrr_growth = round(((mrr - float(prev_rev.mrr)) / float(prev_rev.mrr)) * 100, 1)
    else:
        mrr_growth = 0.0

    # --- Active projects ---
    active_projects: int = db.scalar(
        select(func.count(Project.id)).where(
            Project.status.in_(["kickoff", "in_progress", "uat"]),
            Project.is_deleted == False,  # noqa: E712
        )
    ) or 0

    # --- Open deals ---
    open_stages = [
        OpportunityStage.DISCOVERY,
        OpportunityStage.PROPOSAL,
        OpportunityStage.NEGOTIATION,
    ]
    open_deals: int = db.scalar(
        select(func.count(Opportunity.id)).where(
            Opportunity.stage.in_(open_stages),
            Opportunity.is_deleted == False,  # noqa: E712
        )
    ) or 0
    open_deals_value: float = db.scalar(
        select(func.sum(Opportunity.deal_value)).where(
            Opportunity.stage.in_(open_stages),
            Opportunity.is_deleted == False,  # noqa: E712
        )
    ) or 0.0

    # --- Developer utilization (current ISO week) ---
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday
    devs = db.scalars(
        select(Developer).where(Developer.is_active == True, Developer.is_deleted == False)  # noqa: E712
    ).all()
    team_size = len(devs)

    if devs:
        dev_ids = [d.id for d in devs]
        alloc_rows = db.execute(
            select(
                DeveloperAllocation.developer_id,
                func.sum(DeveloperAllocation.hours_allocated).label("total_hours"),
            )
            .where(
                DeveloperAllocation.developer_id.in_(dev_ids),
                DeveloperAllocation.week_start == week_start,
            )
            .group_by(DeveloperAllocation.developer_id)
        ).all()

        alloc_map = {row.developer_id: row.total_hours for row in alloc_rows}
        utilization_pcts = []
        for dev in devs:
            cap = dev.weekly_capacity or 40.0
            hours = alloc_map.get(dev.id, 0.0)
            utilization_pcts.append(min((hours / cap) * 100, 100))
        developer_utilization = round(sum(utilization_pcts) / len(utilization_pcts), 1)
    else:
        developer_utilization = 0.0

    return {
        "mrr": mrr,
        "mrr_growth": mrr_growth,
        "arr": arr,
        "active_projects": active_projects,
        "open_deals": open_deals,
        "open_deals_value": float(open_deals_value),
        "developer_utilization": developer_utilization,
        "team_size": team_size,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  REVENUE CHART
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/revenue",
    summary="Monthly Revenue Timeline",
    response_description="List of monthly MRR/ARR/pipeline snapshots ordered oldest-first",
)
def get_revenue_points(
    months: int = Query(default=12, ge=1, le=36, description="Number of months to return"),
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> list[dict[str, Any]]:
    rows = db.scalars(
        select(RevenuePoint)
        .order_by(RevenuePoint.month_date.desc())
        .limit(months)
    ).all()

    # Return in ascending order for the chart
    return [
        {
            "month": r.month_label,
            "mrr": float(r.mrr),
            "arr": float(r.arr),
            "pipeline": float(r.pipeline),
        }
        for r in reversed(rows)
    ]


# ══════════════════════════════════════════════════════════════════════════════
#  OPPORTUNITIES / KANBAN
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/opportunities",
    summary="List Opportunities (Kanban Pipeline)",
)
def get_opportunities(
    stage: str | None = Query(default=None, description="Filter by stage slug"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> list[dict[str, Any]]:
    q = select(Opportunity).where(Opportunity.is_deleted == False)  # noqa: E712
    if stage:
        q = q.where(Opportunity.stage == stage)
    q = q.order_by(Opportunity.created_at.desc()).offset(skip).limit(limit)

    opps = db.scalars(q).all()
    return [_opportunity_to_dict(opp, db) for opp in opps]
    result = []
    for opp in opps:
        account: Account | None = db.get(Account, opp.account_id)
        result.append({
            "id": str(opp.id),
            "clientId": str(opp.account_id),
            "clientName": account.company_name if account else "Unknown",
            "title": opp.name,
            "dealType": "Fixed-Cost",            # default — extend when deal_type column added
            "stage": _map_stage(opp.stage),
            "expectedValue": float(opp.deal_value or 0),
            "probability": opp.probability or 0,
            "assignedPM": "Unassigned",
            "pmAvatar": "",
            "techStack": [],
            "estimatedCloseDate": "",
            "lastActivityDate": opp.updated_at.isoformat() if opp.updated_at else "",
        })
    return result


def _map_stage(db_stage: str) -> str:
    """Converts DB enum slug to frontend-friendly label."""
    mapping = {
        "discovery":   "Lead",
        "proposal":    "Proposal",
        "negotiation": "Negotiation",
        "closed_won":  "Closed Won",
        "closed_lost": "Closed Lost",
    }
    return mapping.get(db_stage, "Lead")


def _reverse_map_stage(ui_stage: str) -> str:
    """Converts frontend stage label back to DB slug."""
    mapping = {
        "Lead":        "discovery",
        "Qualified":   "discovery",
        "Proposal":    "proposal",
        "Negotiation": "negotiation",
        "Closed Won":  "closed_won",
        "Closed Lost": "closed_lost",
    }
    return mapping.get(ui_stage, "discovery")


@router.post(
    "/opportunities",
    status_code=status.HTTP_201_CREATED,
    summary="Create an opportunity from the UI",
)
def create_opportunity(
    payload: OpportunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_auth),
) -> dict[str, Any]:
    account = db.scalar(
        select(Account).where(
            Account.company_name == payload.client_name,
            Account.is_deleted == False,  # noqa: E712
        )
    )
    if account is None:
        account = Account(
            company_name=payload.client_name,
            owner_id=current_user.id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            is_deleted=False,
        )
        db.add(account)
        db.flush()

    opp = Opportunity(
        name=payload.title,
        stage=_reverse_map_stage(payload.stage),
        deal_value=payload.expected_value,
        probability=payload.probability,
        account_id=account.id,
        owner_id=current_user.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        is_deleted=False,
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)
    return _opportunity_to_dict(opp, db)


@router.patch(
    "/opportunities/{opportunity_id}",
    summary="Update opportunity details from the UI",
)
def update_opportunity(
    opportunity_id: int,
    payload: OpportunityUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> dict[str, Any]:
    opp: Opportunity | None = db.get(Opportunity, opportunity_id)
    if not opp or opp.is_deleted:
        raise NotFoundException(f"Opportunity {opportunity_id} not found.")

    if payload.title is not None:
        opp.name = payload.title
    if payload.expected_value is not None:
        opp.deal_value = payload.expected_value
    if payload.probability is not None:
        opp.probability = payload.probability
    if payload.stage is not None:
        opp.stage = _reverse_map_stage(payload.stage)
    if payload.client_name is not None:
        account = db.scalar(
            select(Account).where(
                Account.company_name == payload.client_name,
                Account.is_deleted == False,  # noqa: E712
            )
        )
        if account is None:
            account = Account(
                company_name=payload.client_name,
                owner_id=opp.owner_id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                is_deleted=False,
            )
            db.add(account)
            db.flush()
        opp.account_id = account.id

    opp.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(opp)
    return _opportunity_to_dict(opp, db)


@router.delete(
    "/opportunities/{opportunity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete an opportunity from the UI",
)
def delete_opportunity(
    opportunity_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> None:
    opp: Opportunity | None = db.get(Opportunity, opportunity_id)
    if not opp or opp.is_deleted:
        raise NotFoundException(f"Opportunity {opportunity_id} not found.")
    opp.is_deleted = True
    opp.deleted_at = datetime.now(timezone.utc)
    opp.updated_at = datetime.now(timezone.utc)
    db.commit()


@router.patch(
    "/opportunities/{opportunity_id}/stage",
    summary="Move an opportunity to a new stage (Kanban drag-and-drop)",
)
def move_opportunity_stage(
    opportunity_id: int,
    body: dict[str, str],
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> dict[str, Any]:
    opp: Opportunity | None = db.get(Opportunity, opportunity_id)
    if not opp or opp.is_deleted:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(f"Opportunity {opportunity_id} not found.")

    new_stage = _reverse_map_stage(body.get("stage", ""))
    opp.stage = new_stage
    opp.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(opp)
    return {"id": str(opp.id), "stage": _map_stage(opp.stage)}


# ══════════════════════════════════════════════════════════════════════════════
#  DEVELOPERS / RESOURCE HEATMAP
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/developers",
    summary="List all active developers with current-week allocations",
)
def get_developers(
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> list[dict[str, Any]]:
    devs = db.scalars(
        select(Developer).where(
            Developer.is_active == True,  # noqa: E712
            Developer.is_deleted == False,  # noqa: E712
        ).order_by(Developer.name)
    ).all()

    return [_developer_to_dict(dev) for dev in devs]


@router.post(
    "/developers",
    status_code=status.HTTP_201_CREATED,
    summary="Create a resource/developer from the UI",
)
def create_developer(
    payload: DeveloperCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> dict[str, Any]:
    existing = db.scalar(
        select(Developer).where(
            Developer.email == payload.email,
            Developer.is_deleted == False,  # noqa: E712
        )
    )
    if existing:
        raise BadRequestException("A resource with this email already exists.")

    dev = Developer(
        name=payload.name,
        role=payload.role,
        email=payload.email,
        avatar_initials=_initials(payload.name),
        accent_color="#6366f1",
        weekly_capacity=payload.weekly_capacity,
        skills=payload.skills,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        is_deleted=False,
    )
    db.add(dev)
    db.flush()
    _ensure_developer_user(dev, db)
    db.commit()
    db.refresh(dev)
    return _developer_to_dict(dev)


@router.patch(
    "/developers/{developer_id}",
    summary="Update a resource/developer from the UI",
)
def update_developer(
    developer_id: int,
    payload: DeveloperUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> dict[str, Any]:
    dev: Developer | None = db.get(Developer, developer_id)
    if not dev or dev.is_deleted:
        raise NotFoundException(f"Developer {developer_id} not found.")

    if payload.name is not None:
        dev.name = payload.name
        dev.avatar_initials = _initials(payload.name)
    if payload.role is not None:
        dev.role = payload.role
    if payload.email is not None:
        dev.email = payload.email
    if payload.weekly_capacity is not None:
        dev.weekly_capacity = payload.weekly_capacity
    if payload.skills is not None:
        dev.skills = payload.skills

    dev.updated_at = datetime.now(timezone.utc)
    user_id = _ensure_developer_user(dev, db)
    linked_user = db.get(User, user_id)
    if linked_user:
        first_name, last_name = _split_name(dev.name)
        linked_user.first_name = first_name
        linked_user.last_name = last_name
        linked_user.email = dev.email
        linked_user.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(dev)
    return _developer_to_dict(dev)


@router.delete(
    "/developers/{developer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a resource/developer from the UI",
)
def delete_developer(
    developer_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> None:
    dev: Developer | None = db.get(Developer, developer_id)
    if not dev or dev.is_deleted:
        raise NotFoundException(f"Developer {developer_id} not found.")
    dev.is_deleted = True
    dev.is_active = False
    dev.deleted_at = datetime.now(timezone.utc)
    dev.updated_at = datetime.now(timezone.utc)
    db.commit()


@router.get(
    "/projects",
    summary="List projects for task assignment",
)
def get_projects(
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> list[dict[str, Any]]:
    projects = db.scalars(
        select(Project).where(Project.is_deleted == False).order_by(Project.name)  # noqa: E712
    ).all()
    return [_project_to_dict(project) for project in projects]


@router.get(
    "/heatmap",
    summary="Resource Heatmap — weekly utilisation per developer",
)
def get_heatmap(
    weeks: int = Query(default=8, ge=1, le=26, description="Number of weeks to show"),
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> list[dict[str, Any]]:
    # Build the list of week-start Mondays
    today = date.today()
    current_monday = today - timedelta(days=today.weekday())
    week_starts = [
        current_monday - timedelta(weeks=i)
        for i in range(weeks - 1, -1, -1)
    ]

    devs = db.scalars(
        select(Developer).where(
            Developer.is_active == True,  # noqa: E712
            Developer.is_deleted == False,  # noqa: E712
        ).order_by(Developer.name)
    ).all()

    if not devs:
        return []

    dev_ids = [d.id for d in devs]
    alloc_rows = db.execute(
        select(DeveloperAllocation).where(
            DeveloperAllocation.developer_id.in_(dev_ids),
            DeveloperAllocation.week_start.in_(week_starts),
        )
    ).scalars().all()

    # Build lookup: (dev_id, week_start) → allocation
    alloc_map: dict[tuple, DeveloperAllocation] = {}
    for a in alloc_rows:
        alloc_map[(a.developer_id, a.week_start)] = a

    cells: list[dict[str, Any]] = []
    for dev in devs:
        for ws in week_starts:
            alloc = alloc_map.get((dev.id, ws))
            hours = alloc.hours_allocated if alloc else 0.0
            cap = dev.weekly_capacity or 40.0
            utilization_pct = round(min((hours / cap) * 100, 100), 1)
            project_name = ""
            if alloc and alloc.project:
                project_name = alloc.project.name

            cells.append({
                "developerId": str(dev.id),
                "developerName": dev.name,
                "weekLabel": ws.strftime("%-d %b") if hasattr(ws, "strftime") else str(ws),
                "weekStart": ws.isoformat(),
                "utilizationPct": utilization_pct,
                "projectName": project_name,
            })

    return cells


# ══════════════════════════════════════════════════════════════════════════════
#  TASKS / DATA GRID
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/tasks",
    summary="Paginated task list for the Advanced Task Grid",
)
def get_tasks(
    status: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> list[dict[str, Any]]:
    q = select(Task).where(Task.is_deleted == False)  # noqa: E712
    if status:
        q = q.where(Task.status == status)
    q = q.order_by(Task.created_at.desc()).offset(skip).limit(limit)

    tasks = db.scalars(q).all()
    return [_task_to_dict(t, db) for t in tasks]
    result = []
    for t in tasks:
        assignee_name = ""
        if t.assigned_to:
            assignee_name = t.assigned_to.full_name

        result.append({
            "id": str(t.id),
            "projectId": str(t.opportunity_id or ""),
            "projectName": "",
            "title": t.title,
            "assigneeId": str(t.assigned_to_id),
            "assigneeName": assignee_name,
            "status": _map_task_status(t.status),
            "priority": "Medium",
            "storyPoints": 0,
            "dueDate": t.due_date.isoformat() if t.due_date else "",
            "epic": "",
            "sprint": "",
            "techStack": [],
            "createdAt": t.created_at.isoformat() if t.created_at else "",
        })
    return result


def _map_task_status(db_status: str) -> str:
    mapping = {
        "pending":     "Backlog",
        "in_progress": "In Progress",
        "in_review":   "In Review",
        "completed":   "Done",
        "cancelled":   "Blocked",
    }
    return mapping.get(db_status, "Backlog")


def _reverse_map_task_status(ui_status: str) -> str:
    mapping = {
        "Backlog": "pending",
        "In Progress": "in_progress",
        "In Review": "in_review",
        "Done": "completed",
        "Blocked": "cancelled",
    }
    return mapping.get(ui_status, "pending")


@router.post(
    "/tasks",
    status_code=status.HTTP_201_CREATED,
    summary="Create a task from the UI",
)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_auth),
) -> dict[str, Any]:
    if payload.lead_id is not None and payload.opportunity_id is not None:
        raise BadRequestException("A task can be linked to a lead or opportunity, not both.")

    opportunity_id = payload.opportunity_id
    project_id = payload.project_id
    if payload.project_id is not None:
        project = db.get(Project, payload.project_id)
        if not project or project.is_deleted:
            raise BadRequestException("Project does not exist.")
        opportunity_id = project.opportunity_id or opportunity_id

    assignee_id: int | None = None
    if payload.assigned_to_developer_id is not None:
        developer = db.get(Developer, payload.assigned_to_developer_id)
        if not developer or developer.is_deleted or not developer.is_active:
            raise BadRequestException("Assigned resource does not exist.")
        assignee_id = _ensure_developer_user(developer, db)
    elif payload.assigned_to_id is not None:
        developer = _developer_for_user_id(payload.assigned_to_id, db)
        if developer is None:
            raise BadRequestException("Tasks must be assigned to an active employee.")
        assignee_id = _ensure_developer_user(developer, db)
    else:
        raise BadRequestException("Select an employee before creating a task.")

    if assignee_id is None or not db.get(User, assignee_id):
        raise BadRequestException("Assigned user does not exist.")

    task = Task(
        title=payload.title,
        description=payload.description,
        task_type=payload.task_type,
        status=_reverse_map_task_status(payload.status),
        due_date=payload.due_date,
        lead_id=payload.lead_id,
        opportunity_id=opportunity_id,
        project_id=project_id,
        assigned_to_id=assignee_id,
        created_by_id=current_user.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        is_deleted=False,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_dict(task, db)


@router.patch(
    "/tasks/{task_id}",
    summary="Update task status or other fields",
)
def update_task(
    task_id: int,
    body: TaskUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> dict[str, Any]:
    task: Task | None = db.get(Task, task_id)
    if not task or task.is_deleted:
        raise NotFoundException(f"Task {task_id} not found.")

    updated_fields = body.model_fields_set

    if "status" in updated_fields:
        task.status = _reverse_map_task_status(body.status)
    if "title" in updated_fields:
        task.title = body.title
    if "description" in updated_fields:
        task.description = body.description
    if "due_date" in updated_fields:
        task.due_date = body.due_date
    if "project_id" in updated_fields:
        if body.project_id is None:
            task.project_id = None
            task.opportunity_id = None
        else:
            project = db.get(Project, body.project_id)
            if not project or project.is_deleted:
                raise BadRequestException("Project does not exist.")
            task.project_id = body.project_id
            task.opportunity_id = project.opportunity_id or task.opportunity_id
        task.lead_id = None
    if "assigned_to_developer_id" in updated_fields:
        if body.assigned_to_developer_id is None:
            task.assigned_to_id = None
        else:
            developer = db.get(Developer, body.assigned_to_developer_id)
            if not developer or developer.is_deleted or not developer.is_active:
                raise BadRequestException("Assigned resource does not exist.")
            task.assigned_to_id = _ensure_developer_user(developer, db)
    if "assigned_to_id" in updated_fields:
        if body.assigned_to_id is None:
            task.assigned_to_id = None
        else:
            developer = _developer_for_user_id(body.assigned_to_id, db)
            if developer is None:
                raise BadRequestException("Tasks must be assigned to an active employee.")
            task.assigned_to_id = _ensure_developer_user(developer, db)

    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    return _task_to_dict(task, db)


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a task from the UI",
)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> None:
    task: Task | None = db.get(Task, task_id)
    if not task or task.is_deleted:
        raise NotFoundException(f"Task {task_id} not found.")
    task.is_deleted = True
    task.deleted_at = datetime.now(timezone.utc)
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
