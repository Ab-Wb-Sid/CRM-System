"""
config.py - Application Configuration
Loads all settings from environment variables using Pydantic Settings.
No secrets are ever hardcoded. All sensitive values must be in .env.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration object. Pydantic reads values from the environment
    (or .env file) automatically. Type hints enforce correct data types.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Application ────────────────────────────────────────────────────────────
    APP_NAME: str = "Sanestix CRM"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"  # development | staging | production

    # ── MSSQL Database ─────────────────────────────────────────────────────────
    DATABASE_URL: str = ""          # Optional full SQLAlchemy URL for local/dev overrides
    DB_HOST: str                     # e.g. AW-SID-PC\SQLEXRESS
    DB_PORT: int = 1433
    DB_NAME: str                     # e.g. SanestixCRM
    DB_DRIVER: str = "ODBC+Driver+17+for+SQL+Server"
    DB_TRUSTED_CONNECTION: bool = True   # Windows Auth (no user/pass needed)
    DB_ENCRYPT: bool = False

    # Optional — only used when DB_TRUSTED_CONNECTION=false
    DB_USER: str = ""
    DB_PASS: str = ""

    # SQLAlchemy Connection Pool tuning
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30     # seconds to wait for a connection
    DB_POOL_RECYCLE: int = 1800   # recycle connections every 30 min

    # ── Security / JWT ─────────────────────────────────────────────────────────
    SECRET_KEY: str                  # python -c "import secrets; print(secrets.token_hex(32))"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ───────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # ── Pagination Defaults ────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    @property
    def database_url(self) -> str:
        """
        Constructs the SQLAlchemy connection string for MSSQL via pyodbc.

        Windows Authentication (DB_TRUSTED_CONNECTION=true):
            mssql+pyodbc://@HOST/DB?driver=...&Trusted_Connection=yes&TrustServerCertificate=yes

        SQL Authentication (DB_TRUSTED_CONNECTION=false):
            mssql+pyodbc://USER:PASS@HOST:PORT/DB?driver=...
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL

        driver = self.DB_DRIVER  # already URL-encoded (+ for spaces)
        if self.DB_TRUSTED_CONNECTION:
            # Windows Auth — no credentials in URL, pyodbc handles SSPI
            return (
                f"mssql+pyodbc://@{self.DB_HOST}/{self.DB_NAME}"
                f"?driver={driver}"
                f"&Trusted_Connection=yes"
                f"&Encrypt={'yes' if self.DB_ENCRYPT else 'no'}"
                f"&TrustServerCertificate=yes"
            )
        return (
            f"mssql+pyodbc://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?driver={driver}"
            f"&Encrypt={'yes' if self.DB_ENCRYPT else 'no'}"
            f"&TrustServerCertificate=yes"
        )

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached singleton of Settings.
    Use this as a FastAPI dependency: Depends(get_settings).
    The @lru_cache ensures .env is read only once per process lifetime.
    """
    return Settings()
