"""
users/router.py - User Management Endpoints (stub).
Handles profile management, listing team members, and admin user administration.
Full implementation follows the same pattern as the Leads module.
"""

from fastapi import APIRouter, Depends, status

from app.core.rbac import UserRole, require_roles
from app.core.security import get_current_user
from app.modules.users.models import User

router = APIRouter(tags=["User Management"])


@router.get(
    "/me",
    summary="Get current authenticated user's profile",
)
def get_me(current_user: User = Depends(get_current_user)) -> dict:
    """Returns the profile of the authenticated user."""
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }
