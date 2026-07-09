"""Settings must fail closed: required DB vars have no fallback, and the cognito
profile must supply Cognito config (TR-SEC-03, TR-ENV-02)."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings

REQUIRED_DB_ENV = {
    "DB_HOST": "localhost",
    "DB_NAME": "finance_tracker",
    "DB_USER": "finance_user",
    "DB_PASSWORD": "finance_password",
}


@pytest.fixture
def db_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key, value in REQUIRED_DB_ENV.items():
        monkeypatch.setenv(key, value)
    # Pin port/schema so the DSN assertion is hermetic regardless of any ambient
    # DB_PORT/DB_SCHEMA (e.g. a developer running the suite against 5433).
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_SCHEMA", "public")
    # Ensure a clean auth profile unless a test overrides it.
    for key in ("AUTH_PROVIDER", "COGNITO_USER_POOL_ID", "COGNITO_REGION", "COGNITO_APP_CLIENT_ID"):
        monkeypatch.delenv(key, raising=False)


def test_defaults_to_local_profile_and_assembles_dsn(db_env: None) -> None:
    settings = Settings(_env_file=None)
    assert settings.auth_provider == "local"
    assert settings.db_port == 5432
    assert settings.db_schema == "public"
    assert settings.database_url == (
        "postgresql+psycopg://finance_user:finance_password@localhost:5432/finance_tracker"
    )


@pytest.mark.parametrize("missing_key", sorted(REQUIRED_DB_ENV))
def test_missing_required_db_var_raises(
    monkeypatch: pytest.MonkeyPatch, db_env: None, missing_key: str
) -> None:
    monkeypatch.delenv(missing_key, raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_cognito_profile_requires_cognito_settings(
    monkeypatch: pytest.MonkeyPatch, db_env: None
) -> None:
    monkeypatch.setenv("AUTH_PROVIDER", "cognito")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_cognito_profile_accepts_full_cognito_settings(
    monkeypatch: pytest.MonkeyPatch, db_env: None
) -> None:
    monkeypatch.setenv("AUTH_PROVIDER", "cognito")
    monkeypatch.setenv("COGNITO_USER_POOL_ID", "us-east-1_abc")
    monkeypatch.setenv("COGNITO_REGION", "us-east-1")
    monkeypatch.setenv("COGNITO_APP_CLIENT_ID", "client-123")
    settings = Settings(_env_file=None)
    assert settings.cognito_issuer == "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc"
    assert settings.cognito_jwks_url.endswith("/.well-known/jwks.json")


def test_db_vars_have_no_secret_defaults(db_env: None) -> None:
    for name in ("db_host", "db_name", "db_user", "db_password"):
        assert Settings.model_fields[name].is_required(), f"{name} must have no default"
