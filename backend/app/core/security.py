"""JWT verification against Cognito's JWKS — the Cognito auth provider
(AUTH_PROVIDER=cognito). The local provider (development) uses opaque session
tokens instead; see app/services/local_auth_service.py.

This module is framework-agnostic (no FastAPI imports) so it's directly unit
testable — see tests/unit/test_security.py, which signs tokens with a locally
generated RSA keypair and mocks the JWKS HTTP fetch, so the full verification
path runs fully offline in CI.

It performs real RS256/JWKS verification (TR-SEC-02, TR-SEC-14) on every
request, regardless of whether an API Gateway authorizer already verified the
token upstream — defence in depth, and the only enforcement point in any setup
without an authorizer in front. Re-checking in prod is cheap and closes any
authorizer-misconfiguration gap.
"""

import time
from dataclasses import dataclass
from typing import Any

import httpx
from jose import jwt
from jose.exceptions import JOSEError

from app.core.config import settings


class TokenVerificationError(Exception):
    """Raised for any token verification failure. api/deps.py maps every
    instance of this to a generic 401 — the specific reason here is for
    server-side logs only (TR-SEC-10: don't leak internals to the client)."""


@dataclass(frozen=True)
class VerifiedClaims:
    sub: str


class _JwksCache:
    """In-process JWKS cache keyed by `kid`, refreshed on TTL expiry or on a
    cache-miss for an unrecognized `kid` (handles Cognito's normal, rare key
    rotation without requiring a process restart)."""

    def __init__(self, jwks_url: str, ttl_seconds: int) -> None:
        self._jwks_url = jwks_url
        self._ttl_seconds = ttl_seconds
        self._keys_by_kid: dict[str, dict[str, Any]] = {}
        self._fetched_at: float = 0.0

    def _fetch(self) -> None:
        try:
            response = httpx.get(self._jwks_url, timeout=5.0)
            response.raise_for_status()
            keys = response.json()["keys"]
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            raise TokenVerificationError(f"Could not fetch JWKS: {exc}") from exc
        self._keys_by_kid = {key["kid"]: key for key in keys}
        self._fetched_at = time.monotonic()

    def get_key(self, kid: str) -> dict[str, Any]:
        is_stale = (time.monotonic() - self._fetched_at) > self._ttl_seconds
        if kid not in self._keys_by_kid or is_stale:
            self._fetch()
        if kid not in self._keys_by_kid:
            raise TokenVerificationError(f"Unknown JWKS key id: {kid!r}")
        return self._keys_by_kid[kid]


_jwks_cache = _JwksCache(settings.cognito_jwks_url, settings.jwks_cache_ttl_seconds)


def verify_access_token(token: str) -> VerifiedClaims:
    """Verify a Cognito **access** token (not an ID token) and return the
    trusted caller identity. Raises TokenVerificationError on any failure —
    expired, bad signature, wrong issuer, wrong token type, wrong client,
    malformed, or JWKS-unreachable are all treated identically from the
    caller's point of view."""
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JOSEError as exc:
        raise TokenVerificationError(f"Malformed token header: {exc}") from exc

    kid = unverified_header.get("kid")
    if not kid:
        raise TokenVerificationError("Token header missing 'kid'")

    jwk = _jwks_cache.get_key(kid)

    try:
        claims = jwt.decode(
            token,
            jwk,
            algorithms=["RS256"],
            issuer=settings.cognito_issuer,
            # Cognito access tokens carry no standard OIDC `aud` claim — they
            # carry `client_id` instead (see the client_id check below). Skip
            # python-jose's built-in audience check accordingly.
            options={"verify_aud": False},
        )
    except JOSEError as exc:
        raise TokenVerificationError(f"Signature/claim verification failed: {exc}") from exc

    if claims.get("token_use") != "access":
        raise TokenVerificationError(
            f"Expected an access token, got token_use={claims.get('token_use')!r}"
        )

    # Cognito quirk vs. the OIDC spec: access tokens identify the app client
    # via `client_id`, not `aud`. Verified explicitly here in place of the
    # skipped `aud` check above.
    if claims.get("client_id") != settings.cognito_app_client_id:
        raise TokenVerificationError("Token client_id does not match configured app client")

    sub = claims.get("sub")
    if not sub:
        raise TokenVerificationError("Token missing 'sub' claim")

    return VerifiedClaims(sub=sub)
