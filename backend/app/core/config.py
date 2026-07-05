"""Application settings, loaded from the environment.

Required fields have no default, so instantiating ``Settings`` raises
``pydantic.ValidationError`` if any is missing. ``settings`` below is built at
import time (not lazily inside a function), so importing this module — which
``app.main`` does immediately — is what makes the process refuse to start
when required configuration is absent (TR-SEC-03: fail closed, no fallback
secrets).
"""

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Required: no default. Missing env var -> ValidationError at startup. ---
    database_url: str
    cognito_user_pool_id: str
    cognito_region: str
    cognito_app_client_id: str

    # --- Optional: safe, non-secret defaults. ---
    environment: Literal["local", "staging", "production"] = "local"
    log_level: str = "INFO"
    jwks_cache_ttl_seconds: int = 3600
    cors_allow_origins: list[str] = Field(default_factory=lambda: ["*"])
    db_pool_size: int = 5
    db_max_overflow: int = 2
    db_connect_timeout_seconds: int = 5

    @property
    def cognito_issuer(self) -> str:
        return (
            f"https://cognito-idp.{self.cognito_region}.amazonaws.com/{self.cognito_user_pool_id}"
        )

    @property
    def cognito_jwks_url(self) -> str:
        return f"{self.cognito_issuer}/.well-known/jwks.json"


settings = Settings()  # required fields come from the environment; missing ones raise here
