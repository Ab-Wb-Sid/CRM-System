"""
seed.py - Sanestix CRM Database Seed Script.

Run AFTER `alembic upgrade head` to populate the database with:
  - 1 admin user (admin@sanestix.com / Admin@1234)
  - 5 sample developers with skills
  - 3 sample clients (accounts) with opportunities
  - 3 sample projects with developer allocations
  - 12 months of revenue snapshots for the dashboard chart
  - 5 sample tasks

Usage:
    cd backend
    python seed.py
"""

import os
import sys
from datetime import date, datetime, timedelta, timezone

# Ensure the backend/ directory is on the path so `app` imports work
sys.path.insert(0, os.path.dirname(__file__))

from app.config import get_settings
from app.core.security import hash_password
from app.database import SessionLocal
from app.modules.accounts.models import Account, Opportunity, OpportunityStage
from app.modules.leads.models import Lead
from app.modules.crm.models import (
    Developer,
    DeveloperAllocation,
    Project,
    ProjectStatus,
    RevenuePoint,
)
from app.modules.tasks.models import Task, TaskStatus
from app.modules.users.models import User
from app.core.rbac import UserRole

settings = get_settings()


def run_seed() -> None:
    db = SessionLocal()
    try:
        print("🌱 Starting Sanestix CRM seed...")

        # ── 1. Admin User ─────────────────────────────────────────────────────
        admin_email = "admin@sanestix.com"
        if not db.query(User).filter_by(email=admin_email).first():
            admin = User(
                first_name="Super",
                last_name="Admin",
                email=admin_email,
                hashed_password=hash_password("Admin@1234"),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin)
            db.flush()
            print(f"  ✅ Admin user created: {admin_email}")
        else:
            admin = db.query(User).filter_by(email=admin_email).first()
            print(f"  ⏭️  Admin user already exists: {admin_email}")

        # ── 2. Sample Developers ──────────────────────────────────────────────
        developer_data = [
            {
                "name": "Aisha Raza",
                "role": "Senior React Developer",
                "email": "aisha@sanestix.com",
                "avatar_initials": "AR",
                "accent_color": "#6366f1",
                "weekly_capacity": 40.0,
                "skills": ["React", "TypeScript", "GraphQL", "Next.js"],
            },
            {
                "name": "Bilal Khan",
                "role": "Backend Engineer (Python)",
                "email": "bilal@sanestix.com",
                "avatar_initials": "BK",
                "accent_color": "#10b981",
                "weekly_capacity": 40.0,
                "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            },
            {
                "name": "Sara Ahmed",
                "role": "Full-Stack Developer",
                "email": "sara@sanestix.com",
                "avatar_initials": "SA",
                "accent_color": "#f59e0b",
                "weekly_capacity": 40.0,
                "skills": ["React", "Node.js", "MongoDB", "AWS"],
            },
            {
                "name": "Omar Farooq",
                "role": "DevOps / Cloud Engineer",
                "email": "omar@sanestix.com",
                "avatar_initials": "OF",
                "accent_color": "#ef4444",
                "weekly_capacity": 32.0,
                "skills": ["Kubernetes", "Terraform", "Azure", "CI/CD"],
            },
            {
                "name": "Zara Malik",
                "role": "QA Automation Engineer",
                "email": "zara@sanestix.com",
                "avatar_initials": "ZM",
                "accent_color": "#8b5cf6",
                "weekly_capacity": 40.0,
                "skills": ["Selenium", "Pytest", "Cypress", "Postman"],
            },
        ]

        developers: list[Developer] = []
        for d in developer_data:
            existing = db.query(Developer).filter_by(email=d["email"]).first()
            if not existing:
                dev = Developer(**d)
                db.add(dev)
                db.flush()
                developers.append(dev)
                print(f"  ✅ Developer: {d['name']}")
            else:
                developers.append(existing)
                print(f"  ⏭️  Developer already exists: {d['name']}")

        # ── 3. Sample Accounts ────────────────────────────────────────────────
        account_data = [
            {"company_name": "TechNova Solutions", "industry": "FinTech",   "owner_id": admin.id},
            {"company_name": "HealthBridge AI",    "industry": "HealthTech","owner_id": admin.id},
            {"company_name": "RetailEdge Inc.",     "industry": "E-Commerce","owner_id": admin.id},
        ]
        accounts: list[Account] = []
        for a in account_data:
            existing = db.query(Account).filter_by(company_name=a["company_name"]).first()
            if not existing:
                acc = Account(**a)
                db.add(acc)
                db.flush()
                accounts.append(acc)
                print(f"  ✅ Account: {a['company_name']}")
            else:
                accounts.append(existing)
                print(f"  ⏭️  Account exists: {a['company_name']}")

        # ── 4. Sample Opportunities ───────────────────────────────────────────
        opp_data = [
            {
                "name": "TechNova — Staff Augmentation (5 Devs)",
                "stage": OpportunityStage.CLOSED_WON,
                "deal_value": 180000,
                "probability": 100,
                "account_id": accounts[0].id,
                "owner_id": admin.id,
            },
            {
                "name": "HealthBridge — Patient Portal v2",
                "stage": OpportunityStage.PROPOSAL,
                "deal_value": 95000,
                "probability": 60,
                "account_id": accounts[1].id,
                "owner_id": admin.id,
            },
            {
                "name": "RetailEdge — Mobile App Rewrite",
                "stage": OpportunityStage.NEGOTIATION,
                "deal_value": 140000,
                "probability": 75,
                "account_id": accounts[2].id,
                "owner_id": admin.id,
            },
            {
                "name": "TechNova — Analytics Dashboard",
                "stage": OpportunityStage.DISCOVERY,
                "deal_value": 55000,
                "probability": 30,
                "account_id": accounts[0].id,
                "owner_id": admin.id,
            },
        ]
        opportunities: list[Opportunity] = []
        for o in opp_data:
            existing = db.query(Opportunity).filter_by(name=o["name"]).first()
            if not existing:
                opp = Opportunity(**o)
                db.add(opp)
                db.flush()
                opportunities.append(opp)
                print(f"  ✅ Opportunity: {o['name']}")
            else:
                opportunities.append(existing)
                print(f"  ⏭️  Opportunity exists: {o['name']}")

        # ── 5. Sample Projects ────────────────────────────────────────────────
        project_data = [
            {
                "name": "TechNova Staff Augmentation",
                "status": ProjectStatus.IN_PROGRESS,
                "deal_type": "staff_augmentation",
                "budget": 180000,
                "monthly_retainer": 15000,
                "start_date": date(2025, 1, 1),
                "end_date": date(2025, 12, 31),
                "estimated_hours": 4800,
                "burned_hours": 1920,
                "velocity_estimated": 45,
                "velocity_actual": 42,
                "tech_stack": ["React", "Python", "FastAPI", "PostgreSQL"],
                "account_id": accounts[0].id,
                "opportunity_id": opportunities[0].id,
            },
            {
                "name": "HealthBridge Patient Portal",
                "status": ProjectStatus.KICKOFF,
                "deal_type": "fixed_cost",
                "budget": 95000,
                "start_date": date(2025, 5, 1),
                "end_date": date(2025, 9, 30),
                "estimated_hours": 1600,
                "burned_hours": 120,
                "velocity_estimated": 40,
                "velocity_actual": 38,
                "tech_stack": ["React", "Node.js", "MongoDB"],
                "account_id": accounts[1].id,
            },
            {
                "name": "RetailEdge Mobile App",
                "status": ProjectStatus.UAT,
                "deal_type": "fixed_cost",
                "budget": 140000,
                "start_date": date(2024, 11, 1),
                "end_date": date(2025, 6, 30),
                "estimated_hours": 2400,
                "burned_hours": 2100,
                "velocity_estimated": 50,
                "velocity_actual": 47,
                "tech_stack": ["React Native", "TypeScript", "Firebase"],
                "account_id": accounts[2].id,
            },
        ]
        projects: list[Project] = []
        for p in project_data:
            existing = db.query(Project).filter_by(name=p["name"]).first()
            if not existing:
                proj = Project(**p)
                db.add(proj)
                db.flush()
                projects.append(proj)
                print(f"  ✅ Project: {p['name']}")
            else:
                projects.append(existing)
                print(f"  ⏭️  Project exists: {p['name']}")

        # ── 6. Developer Allocations (current week + 3 past weeks) ───────────
        today = date.today()
        current_monday = today - timedelta(days=today.weekday())
        week_starts = [current_monday - timedelta(weeks=i) for i in range(7, -1, -1)]

        # Simple allocation plan: first 3 devs on project 0, dev 3 on proj 1, dev 4 on proj 2
        allocation_plan = [
            (developers[0], projects[0], 36.0),
            (developers[1], projects[0], 40.0),
            (developers[2], projects[1], 32.0),
            (developers[3], projects[2], 24.0),
            (developers[4], projects[0], 40.0),
        ]
        alloc_count = 0
        for dev, proj, hours in allocation_plan:
            for ws in week_starts:
                existing = (
                    db.query(DeveloperAllocation)
                    .filter_by(developer_id=dev.id, project_id=proj.id, week_start=ws)
                    .first()
                )
                if not existing:
                    db.add(DeveloperAllocation(
                        developer_id=dev.id,
                        project_id=proj.id,
                        week_start=ws,
                        hours_allocated=hours,
                    ))
                    alloc_count += 1
        if alloc_count:
            db.flush()
            print(f"  ✅ {alloc_count} developer allocations created")
        else:
            print("  ⏭️  Developer allocations already exist")

        # ── 7. Revenue Points (12 months) ─────────────────────────────────────
        revenue_rows = [
            ("Jan 2025", date(2025, 1, 1),  42000,  504000, 210000),
            ("Feb 2025", date(2025, 2, 1),  44500,  534000, 225000),
            ("Mar 2025", date(2025, 3, 1),  46000,  552000, 280000),
            ("Apr 2025", date(2025, 4, 1),  48000,  576000, 310000),
            ("May 2025", date(2025, 5, 1),  51000,  612000, 340000),
            ("Jun 2025", date(2025, 6, 1),  53500,  642000, 360000),
            ("Jul 2025", date(2025, 7, 1),  55000,  660000, 390000),
            ("Aug 2025", date(2025, 8, 1),  57000,  684000, 410000),
            ("Sep 2025", date(2025, 9, 1),  59500,  714000, 435000),
            ("Oct 2025", date(2025, 10, 1), 62000,  744000, 460000),
            ("Nov 2025", date(2025, 11, 1), 65000,  780000, 490000),
            ("Dec 2025", date(2025, 12, 1), 68500,  822000, 520000),
        ]
        rev_count = 0
        for label, month_date, mrr, arr, pipeline in revenue_rows:
            if not db.query(RevenuePoint).filter_by(month_label=label).first():
                db.add(RevenuePoint(
                    month_label=label,
                    month_date=month_date,
                    mrr=mrr,
                    arr=arr,
                    pipeline=pipeline,
                ))
                rev_count += 1
        if rev_count:
            db.flush()
            print(f"  ✅ {rev_count} revenue points created")
        else:
            print("  ⏭️  Revenue points already exist")

        # ── 8. Sample Tasks ───────────────────────────────────────────────────
        task_data = [
            {
                "title": "Implement OAuth2 login for TechNova portal",
                "task_type": "other",
                "status": TaskStatus.IN_PROGRESS,
                "assigned_to_id": admin.id,
                "created_by_id": admin.id,
                "opportunity_id": opportunities[0].id,
            },
            {
                "title": "Write unit tests for patient data API",
                "task_type": "other",
                "status": TaskStatus.PENDING,
                "assigned_to_id": admin.id,
                "created_by_id": admin.id,
                "opportunity_id": opportunities[1].id,
            },
            {
                "title": "Demo call — RetailEdge UAT sign-off",
                "task_type": "demo",
                "status": TaskStatus.PENDING,
                "assigned_to_id": admin.id,
                "created_by_id": admin.id,
                "opportunity_id": opportunities[2].id,
            },
            {
                "title": "Proposal review — TechNova Analytics",
                "task_type": "meeting",
                "status": TaskStatus.PENDING,
                "assigned_to_id": admin.id,
                "created_by_id": admin.id,
                "opportunity_id": opportunities[3].id,
            },
            {
                "title": "Set up CI/CD pipeline for RetailEdge",
                "task_type": "other",
                "status": TaskStatus.COMPLETED,
                "assigned_to_id": admin.id,
                "created_by_id": admin.id,
                "opportunity_id": opportunities[2].id,
            },
        ]
        task_count = 0
        for t in task_data:
            if not db.query(Task).filter_by(title=t["title"]).first():
                db.add(Task(**t))
                task_count += 1
        if task_count:
            db.flush()
            print(f"  ✅ {task_count} tasks created")
        else:
            print("  ⏭️  Tasks already exist")

        db.commit()
        print()
        print("✅  Seed completed successfully!")
        print()
        print("  Login credentials:")
        print(f"    Email   : admin@sanestix.com")
        print(f"    Password: Admin@1234")
        print()
        print("  Backend: uvicorn app.main:app --reload")
        print("  Docs   : http://localhost:8000/docs")

    except Exception as exc:
        db.rollback()
        print(f"\n❌ Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
