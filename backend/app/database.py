"""
database.py - SQLAlchemy Engine, Session Factory, and Base Model
Implements a production-ready connection pool for MSSQL via pyodbc.
"""

from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()
is_sqlite = settings.database_url.startswith("sqlite")

# ── Engine ─────────────────────────────────────────────────────────────────────
# pool_pre_ping=True: before each checkout, SQLAlchemy runs a lightweight
# "SELECT 1" to detect and discard stale connections automatically.
engine_kwargs = {
    "pool_pre_ping": True,
    "echo": settings.is_development,
    "future": True,
}

if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update(
        {
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT,
            "pool_recycle": settings.DB_POOL_RECYCLE,
        }
    )

engine = create_engine(settings.database_url, **engine_kwargs)


# ── MSSQL-specific: Enable fast_executemany for bulk inserts ───────────────────
@event.listens_for(engine, "before_cursor_execute")
def receive_before_cursor_execute(
    conn, cursor, statement, params, context, executemany: bool
) -> None:
    if executemany and not is_sqlite:
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


def initialize_dev_database() -> None:
    """
    Creates local development tables and the default admin account.
    This is only used for SQLite dev overrides, not production MSSQL.
    """
    if not is_sqlite:
        return

    from app.core.rbac import UserRole
    from app.core.security import hash_password
    from app.modules.accounts.models import Account, Opportunity
    from app.modules.crm.models import Developer, DeveloperAllocation, Project, RevenuePoint
    from app.modules.leads.models import Lead
    from app.modules.tasks.models import Task
    from app.modules.users.models import User

    _models = (
        Account,
        Opportunity,
        Developer,
        DeveloperAllocation,
        Project,
        RevenuePoint,
        Lead,
        Task,
        User,
    )

    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        existing = db.query(User).filter_by(email="admin@sanestix.com").first()
        if existing:
            return

        admin = User(
            first_name="Super",
            last_name="Admin",
            email="admin@sanestix.com",
            hashed_password=hash_password("Admin@1234"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
