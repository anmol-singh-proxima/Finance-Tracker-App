"""Exercises the real RS256/JWKS verification path fully offline: a locally
generated RSA keypair signs test tokens, and respx mocks the JWKS HTTP fetch
so no real AWS/Cognito access is needed to run this suite (TR-CQ-05/06)."""

import time
import uuid
from collections.abc import Generator

import httpx
import pytest
import respx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwk, jwt

import app.core.security as security_module
from app.core.config import settings
from app.core.security import TokenVerificationError, verify_access_token

KID = "test-key-1"


def _generate_keypair() -> tuple[bytes, bytes]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


def _make_token(
    private_pem: bytes,
    *,
    claims_override: dict[str, object] | None = None,
    kid: str = KID,
    exp_offset: int = 3600,
) -> str:
    now = int(time.time())
    claims: dict[str, object] = {
        "sub": "test-user-sub-123",
        "iss": settings.cognito_issuer,
        "token_use": "access",
        "client_id": settings.cognito_app_client_id,
        "iat": now,
        "exp": now + exp_offset,
        "jti": str(uuid.uuid4()),
    }
    if claims_override:
        claims.update(claims_override)
    token: str = jwt.encode(claims, private_pem, algorithm="RS256", headers={"kid": kid})
    return token


@pytest.fixture(scope="session")
def rsa_keypair() -> tuple[bytes, bytes]:
    return _generate_keypair()


@pytest.fixture(scope="session")
def jwk_public(rsa_keypair: tuple[bytes, bytes]) -> dict[str, object]:
    _, public_pem = rsa_keypair
    key_dict: dict[str, object] = jwk.construct(public_pem, algorithm="RS256").to_dict()
    key_dict["kid"] = KID
    key_dict["use"] = "sig"
    return key_dict


@pytest.fixture(autouse=True)
def _fresh_jwks_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    # Each test gets an empty in-process cache so respx mocking below is
    # deterministically exercised, independent of test ordering/pollution.
    fresh_cache = security_module._JwksCache(
        settings.cognito_jwks_url, settings.jwks_cache_ttl_seconds
    )
    monkeypatch.setattr(security_module, "_jwks_cache", fresh_cache)


@pytest.fixture
def mock_jwks(jwk_public: dict[str, object]) -> Generator[respx.MockRouter, None, None]:
    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.get(settings.cognito_jwks_url).mock(
            return_value=httpx.Response(200, json={"keys": [jwk_public]})
        )
        yield respx_mock


def test_valid_token_returns_correct_sub(
    rsa_keypair: tuple[bytes, bytes], mock_jwks: respx.MockRouter
) -> None:
    private_pem, _ = rsa_keypair
    token = _make_token(private_pem)
    verified = verify_access_token(token)
    assert verified.sub == "test-user-sub-123"


def test_expired_token_is_rejected(
    rsa_keypair: tuple[bytes, bytes], mock_jwks: respx.MockRouter
) -> None:
    private_pem, _ = rsa_keypair
    token = _make_token(private_pem, exp_offset=-3600)
    with pytest.raises(TokenVerificationError):
        verify_access_token(token)


def test_wrong_issuer_is_rejected(
    rsa_keypair: tuple[bytes, bytes], mock_jwks: respx.MockRouter
) -> None:
    private_pem, _ = rsa_keypair
    token = _make_token(private_pem, claims_override={"iss": "https://evil.example.com/fake"})
    with pytest.raises(TokenVerificationError):
        verify_access_token(token)


def test_wrong_client_id_is_rejected(
    rsa_keypair: tuple[bytes, bytes], mock_jwks: respx.MockRouter
) -> None:
    private_pem, _ = rsa_keypair
    token = _make_token(private_pem, claims_override={"client_id": "some-other-client-id"})
    with pytest.raises(TokenVerificationError):
        verify_access_token(token)


def test_id_token_is_rejected(
    rsa_keypair: tuple[bytes, bytes], mock_jwks: respx.MockRouter
) -> None:
    private_pem, _ = rsa_keypair
    token = _make_token(private_pem, claims_override={"token_use": "id"})
    with pytest.raises(TokenVerificationError):
        verify_access_token(token)


def test_malformed_token_is_rejected(mock_jwks: respx.MockRouter) -> None:
    with pytest.raises(TokenVerificationError):
        verify_access_token("not-a-real-jwt")


def test_token_signed_by_different_keypair_is_rejected(mock_jwks: respx.MockRouter) -> None:
    forged_private_pem, _ = _generate_keypair()
    forged_token = _make_token(forged_private_pem)
    with pytest.raises(TokenVerificationError):
        verify_access_token(forged_token)


def test_unknown_kid_is_rejected(
    rsa_keypair: tuple[bytes, bytes], mock_jwks: respx.MockRouter
) -> None:
    private_pem, _ = rsa_keypair
    token = _make_token(private_pem, kid="unknown-kid-not-in-jwks")
    with pytest.raises(TokenVerificationError):
        verify_access_token(token)
