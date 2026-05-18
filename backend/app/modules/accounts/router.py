"""accounts/router.py - Account & Opportunity pipeline endpoints (stub)."""
from fastapi import APIRouter
router = APIRouter(tags=["Accounts & Opportunities"])

@router.get("/", summary="List all accounts")
def list_accounts() -> dict:
    """Stub — full implementation mirrors the Leads module pattern."""
    return {"message": "Accounts module — full CRUD follows Leads pattern."}
