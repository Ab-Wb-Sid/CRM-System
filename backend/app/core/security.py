"""
security.py - JWT Token Management and Password Hashing.

Responsibilities:
  - Hash and verify passwords using bcrypt (via passlib).
  - Create and decode signed JWT access and refresh tokens.
  - Provide the `get_current_user` FastAPI dependency used by all protected routes.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.exceptions import UnauthorizedException
from app.database import get_db

settings = get_settings()

# ── Password Hashing ───────────────────────────────────────────────────────────
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer_scheme = HTTPBearer()


def hash_password(plain_password: str) -> str:
    """Returns a bcrypt-hashed version of the given password."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Constant-time comparison to prevent timing attacks."""
    return _pwd_context.verify(plain_password, hashed_password)


# ── Token Creation ─────────────────────────────────────────────────────────────
def _create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    """Internal factory for both access and refresh tokens."""
    expire = datetime.now(timezone.utc) + expires_delta
    payload: dict[str, Any] = {
        "sub": subject,         # Subject: user ID as string
        "type": token_type,     # "access" | "refresh"
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: int) -> str:
    return _create_token(
        subject=str(user_id),
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: int) -> str:
    return _create_token(
        subject=str(user_id),
        token_type="refresh",
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict[str, Any]:
    """
    Decodes and validates a JWT. Raises UnauthorizedException on any failure
    (expired, tampered signature, wrong format, etc.).
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError as exc:
        raise UnauthorizedException("Invalid or expired token.") from exc


# ── FastAPI Dependencies ───────────────────────────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer_scheme),
    db: Session = Depends(get_db),
) -> "User":  # type: ignore[name-defined]  # noqa: F821
    """
    Dependency injected into protected routes.
    Decodes the Bearer token and fetches the user from the database.
    Import the User model here lazily to avoid circular imports.
    """
    # Deferred import to break circular dependency chain
    from app.modules.users.models import User

    payload = decode_token(credentials.credentials)

    if payload.get("type") != "access":
        raise UnauthorizedException("Refresh tokens cannot be used for API access.")

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException("Token subject is missing.")

    user: User | None = db.get(User, int(user_id))
    if user is None:
        raise UnauthorizedException("User not found.")
    if not user.is_active:
        raise UnauthorizedException("User account is inactive.")

    return user
