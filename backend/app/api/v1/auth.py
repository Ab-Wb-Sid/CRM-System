"""
api/v1/auth.py - Authentication Endpoints.

Provides login (token issuance) and token refresh endpoints.
These routes are PUBLIC — they do not require a Bearer token.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.database import get_db
from app.modules.users.models import User

router = APIRouter(tags=["Authentication"])


# ── Schemas ────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive JWT tokens",
    response_description="Access and refresh tokens on successful login.",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Validates email + password credentials and returns:
    - An **access token** (short-lived, for API calls)
    - A **refresh token** (long-lived, for token renewal)
    """
    user: User | None = db.scalar(
        select(User).where(User.email == payload.email, User.is_deleted == False)  # noqa: E712
    )

    if not user or not verify_password(payload.password, user.hashed_password):
        raise UnauthorizedException("Invalid email or password.")

    if not user.is_active:
        raise UnauthorizedException("Your account has been deactivated.")

    from app.config import get_settings
    settings = get_settings()

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token using a refresh token",
)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Accepts a valid refresh token and issues a new access token.
    The refresh token is validated for type (`refresh`) and expiry.
    """
    token_payload = decode_token(payload.refresh_token)

    if token_payload.get("type") != "refresh":
        raise UnauthorizedException("Invalid token type. Provide a refresh token.")

    user_id: int = int(token_payload["sub"])
    user: User | None = db.get(User, user_id)

    if not user or not user.is_active:
        raise UnauthorizedException("User not found or inactive.")

    from app.config import get_settings
    settings = get_settings()

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
