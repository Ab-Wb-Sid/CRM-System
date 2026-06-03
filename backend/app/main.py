"""
main.py - FastAPI Application Entry Point
Wires together all routers, middleware, exception handlers, and lifecycle hooks.
"""

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import initialize_dev_database, is_sqlite, verify_connection
from app.api.v1.router import api_v1_router
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from fastapi.exceptions import RequestValidationError

settings = get_settings()


# ── Lifespan (replaces deprecated on_event) ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: verify DB connectivity. Fail fast so misconfiguration is caught
    before any traffic hits the service.
    Shutdown: placeholder for graceful cleanup (e.g., closing external clients).
    """
    if is_sqlite:
        initialize_dev_database()
    verify_connection()
    print(f"{settings.APP_NAME} v{settings.APP_VERSION} started.")
    yield
    print("Application shutting down.")


# ── Application Instance ───────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Sanestix CRM — A bespoke CRM backend for software development companies. "
        "Built with FastAPI, SQLAlchemy, and Microsoft SQL Server."
    ),
    docs_url="/docs" if settings.is_development else None,   # Hide in prod
    redoc_url="/redoc" if settings.is_development else None,
    openapi_url="/openapi.json" if settings.is_development else None,
    lifespan=lifespan,
)


# ── CORS Middleware ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception Handlers ─────────────────────────────────────────────────────────
app.add_exception_handler(AppException, app_exception_handler)          # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, generic_exception_handler)         # type: ignore[arg-type]


# ── API Routers ────────────────────────────────────────────────────────────────
app.include_router(api_v1_router, prefix="/api/v1")


# ── Health Check ───────────────────────────────────────────────────────────────
@app.get(
    "/health",
    tags=["System"],
    summary="Application Health Check",
    response_description="Returns service status and version",
)
async def health_check() -> dict:
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


# ── Dev Server Entry Point ─────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.is_development,
        log_level="debug" if settings.is_development else "info",
    )
