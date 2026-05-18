"""
rbac.py - Role-Based Access Control (RBAC) Dependency Factories.

Usage:
    @router.post("/leads", dependencies=[Depends(require_roles(UserRole.SALES, UserRole.ADMIN))])

Roles:
    ADMIN   → Full system access
    SALES   → Lead/Opportunity management
    PM      → Project, resource, and milestone management
    DEV     → Read projects, log hours
    CLIENT  → Client portal read-only access
"""

from __future__ import annotations

from enum import StrEnum
from functools import wraps
from typing import Callable

from fastapi import Depends

from app.core.exceptions import ForbiddenException
from app.core.security import get_current_user


class UserRole(StrEnum):
    """All possible roles within Sanestix CRM."""
    ADMIN = "admin"
    SALES = "sales"
    PM = "pm"
    DEV = "dev"
    CLIENT = "client"


# Role hierarchy — higher index = broader access
_ROLE_HIERARCHY: dict[UserRole, int] = {
    UserRole.CLIENT: 0,
    UserRole.DEV: 1,
    UserRole.SALES: 2,
    UserRole.PM: 3,
    UserRole.ADMIN: 4,
}


def require_roles(*allowed_roles: UserRole) -> Callable:
    """
    Dependency factory: returns a FastAPI dependency that enforces that
    the authenticated user has at least one of the specified roles.

    Example:
        Depends(require_roles(UserRole.ADMIN, UserRole.PM))
    """
    allowed = frozenset(allowed_roles)

    def _dependency(current_user=Depends(get_current_user)):  # type: ignore[no-untyped-def]
        if current_user.role not in allowed:
            raise ForbiddenException(
                f"Access denied. Required roles: {', '.join(allowed)}."
            )
        return current_user

    return _dependency


def require_min_role(min_role: UserRole) -> Callable:
    """
    Dependency factory: enforces a minimum role level based on the hierarchy.
    ADMIN > PM > SALES > DEV > CLIENT.

    Example:
        Depends(require_min_role(UserRole.PM))  # allows PM and ADMIN
    """
    min_level = _ROLE_HIERARCHY[min_role]

    def _dependency(current_user=Depends(get_current_user)):  # type: ignore[no-untyped-def]
        user_level = _ROLE_HIERARCHY.get(current_user.role, -1)
        if user_level < min_level:
            raise ForbiddenException(
                f"Insufficient permissions. Minimum role required: {min_role}."
            )
        return current_user

    return _dependency
