"""Application settings, loaded from the environment.

Required fields have no default, so instantiating ``Settings`` raises
``pydantic.ValidationError`` if any is missing. ``settings`` below is built at
import time (not lazily inside a function), so importing this module — which
``app.main`` does immediately — is what makes the process refuse to start
when required configuration is absent (TR-SEC-03: fail closed, no fallback
secrets).

Two environment profiles share this file (TR-ENV-01):
  - ``AUTH_PROVIDER=local``   — DB-backed auth, no AWS (local development)
  - ``AUTH_PROVIDER=cognito`` — Cognito JWT verification (staging/production)
The Cognito settings are required only for the cognito profile; the validator
below enforces that, so each profile still fails closed on its own inputs.
"""

from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AuthProvider = Literal["local", "cognito"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Database: assembled into a DSN in code so credentials live as separate
    # env vars and can be rotated individually (TR-ENV-02). host/name/user/
    # password are required (no defaults); port/schema have safe defaults. ---
    db_host: str
    db_name: str
    db_user: str
    db_password: str
    db_port: int = 5432
    db_schema: str = "public"

    # --- Auth provider selection. Defaults to the AWS-free local provider so
    # local dev is zero-config; deployed environments set this to "cognito". ---
    auth_provider: AuthProvider = "local"

    # --- Cognito (required only when auth_provider == "cognito"). ---
    cognito_user_pool_id: str | None = None
    cognito_region: str | None = None
    cognito_app_client_id: str | None = None

    # --- Local auth provider tuning (used only when auth_provider == "local"). ---
    local_session_ttl_hours: int = 24
    # Per-IP limit on the open (unauthenticated) auth endpoints.
    auth_rate_limit_max_attempts: int = 10
    auth_rate_limit_window_seconds: int = 300

    # --- Optional: safe, non-secret defaults. ---
    environment: Literal["local", "staging", "production"] = "local"
    log_level: str = "INFO"
    jwks_cache_ttl_seconds: int = 3600
    cors_allow_origins: list[str] = Field(default_factory=lambda: ["*"])
    db_pool_size: int = 5
    db_max_overflow: int = 2
    db_connect_timeout_seconds: int = 5

    @model_validator(mode="after")
    def _require_cognito_when_selected(self) -> "Settings":
        if self.auth_provider == "cognito":
            missing = [
                name
                for name, value in (
                    ("COGNITO_USER_POOL_ID", self.cognito_user_pool_id),
                    ("COGNITO_REGION", self.cognito_region),
                    ("COGNITO_APP_CLIENT_ID", self.cognito_app_client_id),
                )
                if not value
            ]
            if missing:
                raise ValueError(f"auth_provider='cognito' requires {', '.join(missing)} to be set")
        return self

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def cognito_issuer(self) -> str:
        return (
            f"https://cognito-idp.{self.cognito_region}.amazonaws.com/{self.cognito_user_pool_id}"
        )

    @property
    def cognito_jwks_url(self) -> str:
        return f"{self.cognito_issuer}/.well-known/jwks.json"


settings = Settings()  # required fields come from the environment; missing ones raise here
