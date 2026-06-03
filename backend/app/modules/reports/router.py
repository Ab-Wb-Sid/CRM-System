"""
modules/reports/router.py - Report generation and CSV downloads.

The report endpoints aggregate existing CRM data without adding new storage.
They return JSON for the UI preview and CSV for direct downloads.
"""

from __future__ import annotations

import csv
from datetime import date, datetime, timedelta
from io import StringIO
from typing import Any, Iterable

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException
from app.core.security import get_current_user
from app.database import get_db
from app.modules.accounts.models import Account, Opportunity, OpportunityStage
from app.modules.crm.models import Developer, DeveloperAllocation, Project, RevenuePoint
from app.modules.tasks.models import Task
from app.modules.users.models import User

router = APIRouter(tags=["Reports"])

REPORT_TYPES = {"dashboard", "pipeline", "resources", "tasks"}


def _require_auth(current_user: User = Depends(get_current_user)) -> User:
    return current_user


def _money(value: Any) -> float:
    return round(float(value or 0), 2)


def _report_filename(report_type: str) -> str:
    stamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    return f"sanestix-{report_type}-report-{stamp}.csv"


def _csv_response(report_type: str, rows: Iterable[dict[str, Any]]) -> StreamingResponse:
    rows = list(rows)
    buffer = StringIO()
    fieldnames = list(rows[0].keys()) if rows else ["message"]
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    if rows:
        writer.writerows(rows)
    else:
        writer.writerow({"message": "No data available"})
    buffer.seek(0)

    filename = _report_filename(report_type)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _dashboard_summary(db: Session) -> dict[str, Any]:
    latest_rev = db.scalar(
        select(RevenuePoint).order_by(RevenuePoint.month_date.desc()).limit(1)
    )
    prev_rev = db.scalar(
        select(RevenuePoint).order_by(RevenuePoint.month_date.desc()).offset(1).limit(1)
    )

    mrr = _money(latest_rev.mrr if latest_rev else 0)
    arr = _money(latest_rev.arr if latest_rev else 0)
    prev_mrr = _money(prev_rev.mrr if prev_rev else 0)
    mrr_growth = round(((mrr - prev_mrr) / prev_mrr) * 100, 1) if prev_mrr else 0.0

    active_projects = db.scalar(
        select(func.count(Project.id)).where(
            Project.status.in_(["kickoff", "in_progress", "uat"]),
            Project.is_deleted == False,  # noqa: E712
        )
    ) or 0

    open_stages = [
        OpportunityStage.DISCOVERY,
        OpportunityStage.PROPOSAL,
        OpportunityStage.NEGOTIATION,
    ]
    open_deals = db.scalar(
        select(func.count(Opportunity.id)).where(
            Opportunity.stage.in_(open_stages),
            Opportunity.is_deleted == False,  # noqa: E712
        )
    ) or 0
    open_deals_value = db.scalar(
        select(func.sum(Opportunity.deal_value)).where(
            Opportunity.stage.in_(open_stages),
            Opportunity.is_deleted == False,  # noqa: E712
        )
    ) or 0

    return {
        "mrr": mrr,
        "arr": arr,
        "mrr_growth": mrr_growth,
        "active_projects": active_projects,
        "open_deals": open_deals,
        "open_deals_value": _money(open_deals_value),
    }


def _pipeline_rows(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        select(Opportunity, Account.company_name)
        .join(Account, Account.id == Opportunity.account_id, isouter=True)
        .where(Opportunity.is_deleted == False)  # noqa: E712
        .order_by(Opportunity.updated_at.desc())
    ).all()

    return [
        {
            "id": opportunity.id,
            "opportunity": opportunity.name,
            "client": company_name or "Unknown",
            "stage": opportunity.stage,
            "deal_value": _money(opportunity.deal_value),
            "probability": opportunity.probability or 0,
            "weighted_value": _money((float(opportunity.deal_value or 0) * (opportunity.probability or 0)) / 100),
            "updated_at": opportunity.updated_at.isoformat() if opportunity.updated_at else "",
        }
        for opportunity, company_name in rows
    ]


def _resource_rows(db: Session) -> list[dict[str, Any]]:
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    developers = db.scalars(
        select(Developer).where(
            Developer.is_active == True,  # noqa: E712
            Developer.is_deleted == False,  # noqa: E712
        ).order_by(Developer.name)
    ).all()

    if not developers:
        return []

    dev_ids = [developer.id for developer in developers]
    allocations = db.execute(
        select(
            DeveloperAllocation.developer_id,
            func.sum(DeveloperAllocation.hours_allocated).label("allocated_hours"),
        )
        .where(
            DeveloperAllocation.developer_id.in_(dev_ids),
            DeveloperAllocation.week_start == week_start,
        )
        .group_by(DeveloperAllocation.developer_id)
    ).all()
    allocation_map = {row.developer_id: float(row.allocated_hours or 0) for row in allocations}

    return [
        {
            "id": developer.id,
            "name": developer.name,
            "role": developer.role,
            "email": developer.email,
            "weekly_capacity": developer.weekly_capacity,
            "allocated_hours": allocation_map.get(developer.id, 0),
            "utilization_pct": round(
                min((allocation_map.get(developer.id, 0) / (developer.weekly_capacity or 40)) * 100, 100),
                1,
            ),
            "skills": ", ".join(developer.skills or []),
        }
        for developer in developers
    ]


def _task_rows(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        select(Task, Project.name.label("project_name"), Developer.name.label("developer_name"))
        .join(Project, Project.id == Task.project_id, isouter=True)
        .join(Developer, Developer.user_id == Task.assigned_to_id, isouter=True)
        .where(Task.is_deleted == False)  # noqa: E712
        .order_by(Task.created_at.desc())
    ).all()

    return [
        {
            "id": task.id,
            "title": task.title,
            "status": task.status,
            "project": project_name or "",
            "assignee": developer_name or "",
            "due_date": task.due_date.isoformat() if task.due_date else "",
            "created_at": task.created_at.isoformat() if task.created_at else "",
        }
        for task, project_name, developer_name in rows
    ]


def _report_rows(report_type: str, db: Session) -> list[dict[str, Any]]:
    if report_type == "dashboard":
        summary = _dashboard_summary(db)
        return [{"metric": key, "value": value} for key, value in summary.items()]
    if report_type == "pipeline":
        return _pipeline_rows(db)
    if report_type == "resources":
        return _resource_rows(db)
    if report_type == "tasks":
        return _task_rows(db)
    raise BadRequestException(f"Unsupported report type: {report_type}")


@router.get("", summary="Generate report preview data")
def get_report(
    report_type: str = Query(default="dashboard", pattern="^(dashboard|pipeline|resources|tasks)$"),
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> dict[str, Any]:
    rows = _report_rows(report_type, db)
    return {
        "type": report_type,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "row_count": len(rows),
        "rows": rows,
    }


@router.get("/download", summary="Download a generated report as CSV")
def download_report(
    report_type: str = Query(default="dashboard", pattern="^(dashboard|pipeline|resources|tasks)$"),
    db: Session = Depends(get_db),
    _user: User = Depends(_require_auth),
) -> StreamingResponse:
    return _csv_response(report_type, _report_rows(report_type, db))
