"""
dev_seed.py - Populate the local development database.

This script is safe to run repeatedly. It inserts the dashboard, pipeline,
resource, project, revenue, and task data that the React app expects.
"""

from __future__ import annotations

import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from app.core.rbac import UserRole
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.modules.accounts.models import Account, Opportunity, OpportunityStage
from app.modules.crm.models import (
    DealType,
    Developer,
    DeveloperAllocation,
    Project,
    ProjectStatus,
    RevenuePoint,
)
from app.modules.leads.models import Lead
from app.modules.tasks.models import Task, TaskStatus
from app.modules.users.models import User


def get_or_create_user(db) -> User:
    admin = db.query(User).filter_by(email="admin@sanestix.com").first()
    if admin:
        return admin

    admin = User(
        first_name="Super",
        last_name="Admin",
        email="admin@sanestix.com",
        hashed_password=hash_password("Admin@1234"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.flush()
    return admin


def seed() -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admin = get_or_create_user(db)

        developer_data = [
            ("Aisha Raza", "Senior React Developer", "aisha@sanestix.com", "AR", "#6366f1", 40.0, ["React", "TypeScript", "GraphQL", "Next.js"]),
            ("Bilal Khan", "Backend Engineer", "bilal@sanestix.com", "BK", "#10b981", 40.0, ["Python", "FastAPI", "PostgreSQL", "Docker"]),
            ("Sara Ahmed", "Full-Stack Developer", "sara@sanestix.com", "SA", "#f59e0b", 40.0, ["React", "Node.js", "MongoDB", "AWS"]),
            ("Omar Farooq", "DevOps Engineer", "omar@sanestix.com", "OF", "#ef4444", 32.0, ["Kubernetes", "Terraform", "Azure", "CI/CD"]),
            ("Zara Malik", "QA Automation Engineer", "zara@sanestix.com", "ZM", "#8b5cf6", 40.0, ["Playwright", "Pytest", "Cypress", "Postman"]),
        ]
        developers: list[Developer] = []
        for name, role, email, initials, color, capacity, skills in developer_data:
            dev = db.query(Developer).filter_by(email=email).first()
            if not dev:
                dev_user = db.query(User).filter_by(email=email).first()
                if not dev_user:
                    first_name, last_name = name.split(" ", 1)
                    dev_user = User(
                        first_name=first_name,
                        last_name=last_name,
                        email=email,
                        hashed_password=hash_password("Dev@1234"),
                        role=UserRole.DEV,
                        is_active=True,
                    )
                    db.add(dev_user)
                    db.flush()
                dev = Developer(
                    name=name,
                    role=role,
                    email=email,
                    avatar_initials=initials,
                    accent_color=color,
                    weekly_capacity=capacity,
                    skills=skills,
                    user_id=dev_user.id,
                    is_active=True,
                )
                db.add(dev)
                db.flush()
            developers.append(dev)

        account_data = [
            ("TechNova Solutions", "FinTech"),
            ("HealthBridge AI", "HealthTech"),
            ("RetailEdge Inc.", "E-Commerce"),
            ("Orbis Analytics", "Data Platform"),
        ]
        accounts: list[Account] = []
        for company_name, industry in account_data:
            account = db.query(Account).filter_by(company_name=company_name).first()
            if not account:
                account = Account(company_name=company_name, industry=industry, owner_id=admin.id)
                db.add(account)
                db.flush()
            accounts.append(account)

        opportunity_data = [
            ("TechNova Staff Augmentation", OpportunityStage.CLOSED_WON, 180000, 100, accounts[0]),
            ("HealthBridge Patient Portal v2", OpportunityStage.PROPOSAL, 95000, 60, accounts[1]),
            ("RetailEdge Mobile App Rewrite", OpportunityStage.NEGOTIATION, 140000, 75, accounts[2]),
            ("Orbis Analytics Managed Services", OpportunityStage.DISCOVERY, 72000, 35, accounts[3]),
            ("TechNova Analytics Dashboard", OpportunityStage.DISCOVERY, 55000, 30, accounts[0]),
        ]
        opportunities: list[Opportunity] = []
        for name, stage, value, probability, account in opportunity_data:
            opp = db.query(Opportunity).filter_by(name=name).first()
            if not opp:
                opp = Opportunity(
                    name=name,
                    stage=stage,
                    deal_value=value,
                    probability=probability,
                    account_id=account.id,
                    owner_id=admin.id,
                )
                db.add(opp)
                db.flush()
            opportunities.append(opp)

        project_data = [
            ("TechNova Staff Augmentation", ProjectStatus.IN_PROGRESS, DealType.STAFF_AUGMENTATION, 180000, 15000, date(2026, 1, 1), date(2026, 12, 31), 4800, 1920, 45, 42, ["React", "Python", "FastAPI"], accounts[0], opportunities[0]),
            ("HealthBridge Patient Portal", ProjectStatus.KICKOFF, DealType.FIXED_COST, 95000, None, date(2026, 5, 1), date(2026, 9, 30), 1600, 120, 40, 38, ["React", "Node.js", "MongoDB"], accounts[1], opportunities[1]),
            ("RetailEdge Mobile App", ProjectStatus.UAT, DealType.FIXED_COST, 140000, None, date(2026, 1, 15), date(2026, 6, 30), 2400, 2100, 50, 47, ["React Native", "TypeScript", "Firebase"], accounts[2], opportunities[2]),
        ]
        projects: list[Project] = []
        for name, status, deal_type, budget, retainer, start, end, estimated, burned, vel_est, vel_actual, stack, account, opp in project_data:
            project = db.query(Project).filter_by(name=name).first()
            if not project:
                project = Project(
                    name=name,
                    status=status,
                    deal_type=deal_type,
                    budget=budget,
                    monthly_retainer=retainer,
                    start_date=start,
                    end_date=end,
                    estimated_hours=estimated,
                    burned_hours=burned,
                    velocity_estimated=vel_est,
                    velocity_actual=vel_actual,
                    tech_stack=stack,
                    account_id=account.id,
                    opportunity_id=opp.id,
                )
                db.add(project)
                db.flush()
            projects.append(project)

        today = date.today()
        current_monday = today - timedelta(days=today.weekday())
        week_starts = [current_monday - timedelta(weeks=i) for i in range(7, -1, -1)]
        allocation_plan = [
            (developers[0], projects[0], 36.0),
            (developers[1], projects[0], 40.0),
            (developers[2], projects[1], 32.0),
            (developers[3], projects[2], 24.0),
            (developers[4], projects[0], 40.0),
        ]
        for developer, project, hours in allocation_plan:
            for week_start in week_starts:
                existing = (
                    db.query(DeveloperAllocation)
                    .filter_by(developer_id=developer.id, project_id=project.id, week_start=week_start)
                    .first()
                )
                if not existing:
                    db.add(
                        DeveloperAllocation(
                            developer_id=developer.id,
                            project_id=project.id,
                            week_start=week_start,
                            hours_allocated=hours,
                        )
                    )

        revenue_rows = [
            ("Jun 2025", date(2025, 6, 1), 53500, 642000, 360000),
            ("Jul 2025", date(2025, 7, 1), 55000, 660000, 390000),
            ("Aug 2025", date(2025, 8, 1), 57000, 684000, 410000),
            ("Sep 2025", date(2025, 9, 1), 59500, 714000, 435000),
            ("Oct 2025", date(2025, 10, 1), 62000, 744000, 460000),
            ("Nov 2025", date(2025, 11, 1), 65000, 780000, 490000),
            ("Dec 2025", date(2025, 12, 1), 68500, 822000, 520000),
            ("Jan 2026", date(2026, 1, 1), 71200, 854400, 548000),
            ("Feb 2026", date(2026, 2, 1), 73600, 883200, 575000),
            ("Mar 2026", date(2026, 3, 1), 75900, 910800, 598000),
            ("Apr 2026", date(2026, 4, 1), 78400, 940800, 622000),
            ("May 2026", date(2026, 5, 1), 81200, 974400, 654000),
        ]
        for label, month_date, mrr, arr, pipeline in revenue_rows:
            if not db.query(RevenuePoint).filter_by(month_label=label).first():
                db.add(
                    RevenuePoint(
                        month_label=label,
                        month_date=month_date,
                        mrr=mrr,
                        arr=arr,
                        pipeline=pipeline,
                    )
                )

        task_data = [
            ("Implement OAuth2 login for TechNova portal", TaskStatus.IN_PROGRESS, projects[0], developers[0], opportunities[0], date.today() + timedelta(days=4)),
            ("Write unit tests for patient data API", TaskStatus.PENDING, projects[1], developers[1], opportunities[1], date.today() + timedelta(days=7)),
            ("RetailEdge UAT sign-off demo", TaskStatus.PENDING, projects[2], developers[3], opportunities[2], date.today() + timedelta(days=2)),
            ("Proposal review for TechNova Analytics", TaskStatus.IN_REVIEW, projects[0], developers[2], opportunities[4], date.today() + timedelta(days=3)),
            ("Set up CI/CD pipeline for RetailEdge", TaskStatus.COMPLETED, projects[2], developers[3], opportunities[2], date.today() - timedelta(days=2)),
        ]
        for title, status, project, developer, opportunity, due_date in task_data:
            if not db.query(Task).filter_by(title=title).first():
                db.add(
                    Task(
                        title=title,
                        task_type="other",
                        status=status,
                        due_date=due_date,
                        project_id=project.id,
                        opportunity_id=opportunity.id,
                        assigned_to_id=developer.user_id,
                        created_by_id=admin.id,
                    )
                )

        db.commit()

        counts = {
            "users": db.query(User).count(),
            "developers": db.query(Developer).count(),
            "projects": db.query(Project).count(),
            "revenue_points": db.query(RevenuePoint).count(),
            "accounts": db.query(Account).count(),
            "opportunities": db.query(Opportunity).count(),
            "tasks": db.query(Task).count(),
        }
        print(counts)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
