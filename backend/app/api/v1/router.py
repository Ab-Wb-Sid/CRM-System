"""
api/v1/router.py - Versioned API Aggregator.

This is the single file that mounts ALL module routers under /api/v1.
Adding a new CRM module means importing its router here and calling include_router.
"""

from fastapi import APIRouter

from app.modules.leads.router import router as leads_router
from app.modules.users.router import router as users_router
from app.modules.accounts.router import router as accounts_router
from app.modules.tasks.router import router as tasks_router
from app.modules.crm.router import router as crm_router
from app.modules.reports.router import router as reports_router
from app.api.v1.auth import router as auth_router

api_v1_router = APIRouter()

# ── Authentication (public) ────────────────────────────────────────────────────
api_v1_router.include_router(auth_router, prefix="/auth")

# ── CRM Modules (protected) ────────────────────────────────────────────────────
api_v1_router.include_router(users_router, prefix="/users")
api_v1_router.include_router(leads_router, prefix="/leads")
api_v1_router.include_router(accounts_router, prefix="/accounts")
api_v1_router.include_router(tasks_router, prefix="/tasks")
api_v1_router.include_router(crm_router, prefix="/crm")
api_v1_router.include_router(reports_router, prefix="/reports")
