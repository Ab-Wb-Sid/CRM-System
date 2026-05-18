"""tasks/router.py - Task & Activity endpoints (stub)."""
from fastapi import APIRouter
router = APIRouter(tags=["Tasks & Activity Tracking"])

@router.get("/", summary="List all tasks")
def list_tasks() -> dict:
    """Stub — full implementation mirrors the Leads module pattern."""
    return {"message": "Tasks module — full CRUD follows Leads pattern."}
