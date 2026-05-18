import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Make the `app` package importable from the backend/ directory ──────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ── Load app settings (reads .env automatically via pydantic-settings) ─────────
from app.config import get_settings
from app.database import Base

# Import ALL model modules so Alembic autogenerate can detect every table.
from app.modules.accounts import models as account_models  # noqa: F401
from app.modules.crm import models as crm_models  # noqa: F401
from app.modules.leads import models as lead_models  # noqa: F401
from app.modules.tasks import models as task_models  # noqa: F401
from app.modules.users import models as user_models  # noqa: F401

settings = get_settings()

# ── Alembic Config ─────────────────────────────────────────────────────────────
config = context.config

# Override the sqlalchemy.url from alembic.ini with our dynamic connection URL
config.set_main_option("sqlalchemy.url", settings.database_url)

# Python logging setup
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# ── Offline migrations (generates SQL script without connecting) ───────────────
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online migrations (applies to live database) ──────────────────────────────
def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
