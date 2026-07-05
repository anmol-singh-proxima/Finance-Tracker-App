"""Settings must fail closed: a missing required var raises, never falls back
to a default secret (TR-SEC-03)."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings

REQUIRED_ENV = {
    "DATABASE_URL": "postgresql+psycopg://u:p@localhost:5432/db",
    "COGNITO_USER_POOL_ID": "us-east-1_test",
    "COGNITO_REGION": "us-east-1",
    "COGNITO_APP_CLIENT_ID": "test-client-id",
}


@pytest.fixture
def full_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key, value in REQUIRED_ENV.items():
        monkeypatch.setenv(key, value)


def test_settings_load_with_all_required_vars_present(full_env: None) -> None:
    settings = Settings(_env_file=None)
    assert settings.database_url == REQUIRED_ENV["DATABASE_URL"]
    assert settings.cognito_user_pool_id == REQUIRED_ENV["COGNITO_USER_POOL_ID"]
    assert settings.environment == "local"
    assert settings.cors_allow_origins == ["*"]


@pytest.mark.parametrize("missing_key", sorted(REQUIRED_ENV))
def test_settings_raises_when_a_required_var_is_missing(
    monkeypatch: pytest.MonkeyPatch, full_env: None, missing_key: str
) -> None:
    monkeypatch.delenv(missing_key, raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_no_required_field_has_a_literal_default(full_env: None) -> None:
    # Guards against ever reintroducing a `field: str = "fallback-secret"` pattern.
    for name in ("database_url", "cognito_user_pool_id", "cognito_region", "cognito_app_client_id"):
        field = Settings.model_fields[name]
        assert field.is_required(), f"{name} must have no default (fail closed)"


def test_cognito_issuer_and_jwks_url_are_derived_correctly(full_env: None) -> None:
    settings = Settings(_env_file=None)
    assert settings.cognito_issuer == "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test"
    assert settings.cognito_jwks_url == (
        "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test/.well-known/jwks.json"
    )
