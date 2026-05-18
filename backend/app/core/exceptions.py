"""
exceptions.py - Global Exception Hierarchy and FastAPI Exception Handlers.

Design:
  - AppException is the single parent for all domain errors.
  - Subclasses pin a default HTTP status code and error code string.
  - The three handlers below convert exceptions into a consistent JSON envelope.
"""

from __future__ import annotations

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.config import get_settings

settings = get_settings()


# ── Base Exception ─────────────────────────────────────────────────────────────
class AppException(Exception):
    """
    Base class for all Sanestix domain exceptions.
    Carry a human-readable message, a machine-readable error code,
    and the HTTP status code that maps to this error class.
    """

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, error_code: str | None = None) -> None:
        self.message = message
        if error_code:
            self.error_code = error_code
        super().__init__(message)


# ── Domain Exceptions ──────────────────────────────────────────────────────────
class NotFoundException(AppException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "RESOURCE_NOT_FOUND"


class ConflictException(AppException):
    status_code = status.HTTP_409_CONFLICT
    error_code = "RESOURCE_CONFLICT"


class UnauthorizedException(AppException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "UNAUTHORIZED"


class ForbiddenException(AppException):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "FORBIDDEN"


class BadRequestException(AppException):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "BAD_REQUEST"


class UnprocessableEntityException(AppException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "UNPROCESSABLE_ENTITY"


# ── Error Envelope Builder ─────────────────────────────────────────────────────
def _error_response(
    status_code: int,
    error_code: str,
    message: str,
    detail: object | None = None,
) -> JSONResponse:
    """Builds the canonical JSON error envelope used by all handlers."""
    payload: dict = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
        },
    }
    if detail is not None:
        payload["error"]["detail"] = detail
    return JSONResponse(status_code=status_code, content=payload)


# ── Handlers ───────────────────────────────────────────────────────────────────
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handles all AppException subclasses."""
    return _error_response(exc.status_code, exc.error_code, exc.message)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handles Pydantic validation errors (422).
    Reformats FastAPI's verbose error list into a readable structure.
    """
    errors = [
        {
            "field": " → ".join(str(loc) for loc in err["loc"]),
            "message": err["msg"],
            "type": err["type"],
        }
        for err in exc.errors()
    ]
    return _error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_code="VALIDATION_ERROR",
        message="Request body validation failed.",
        detail=errors,
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for unexpected exceptions.
    In development, exposes the raw error. In production, returns a safe message.
    """
    message = str(exc) if settings.is_development else "An unexpected error occurred."
    return _error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code="INTERNAL_SERVER_ERROR",
        message=message,
    )
