"""
database.py - SQLAlchemy Engine, Session Factory, and Base Model
Implements a production-ready connection pool for MSSQL via pyodbc.
"""

from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

# ── Engine ─────────────────────────────────────────────────────────────────────
# pool_pre_ping=True: before each checkout, SQLAlchemy runs a lightweight
# "SELECT 1" to detect and discard stale connections automatically.
engine = create_engine(
    settings.database_url,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
    echo=settings.is_development,  # Log SQL only in dev mode
    future=True,                   # Enable SQLAlchemy 2.x style
)


# ── MSSQL-specific: Enable fast_executemany for bulk inserts ───────────────────
@event.listens_for(engine, "before_cursor_execute")
def receive_before_cursor_execute(
    conn, cursor, statement, params, context, executemany: bool
) -> None:
    if executemany:
        cursor.fast_executemany = True


# ── Session Factory ────────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,  # Prevents lazy-load issues after commit
)


# ── Declarative Base ───────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """
    All ORM models inherit from this class.
    Provides the metadata registry SQLAlchemy uses for schema management.
    """
    pass


# ── Dependency ─────────────────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a scoped database session per request.
    The session is guaranteed to close (and roll back on error) via finally.

    Usage in router:
        db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def verify_connection() -> bool:
    """
    Health-check utility. Returns True if the database is reachable.
    Called during application startup to fail fast on misconfiguration.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        raise RuntimeError(f"Database connection failed: {exc}") from exc
