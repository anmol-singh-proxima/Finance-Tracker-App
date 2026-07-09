"""Local auth provider endpoints (AUTH_PROVIDER=local) — register / login / me /
logout, plus the security-relevant negative cases (TR-SEC-01L)."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import app.api.routers.auth as auth_router
from app.api.deps import get_current_user_id, get_db
from app.main import app


@pytest.fixture(autouse=True)
def _reset_rate_limiter() -> Iterator[None]:
    # The limiter is a module-level singleton keyed by client IP; reset it so
    # attempts from one test don't leak into the next (all share "testclient").
    auth_router._limiter.reset()
    yield
    auth_router._limiter.reset()


def _register(client: TestClient, username: str = "alice", password: str = "Sup3rSecret!") -> None:
    resp = client.post(
        "/api/auth/register", json={"username": username, "password": password, "email": None}
    )
    assert resp.status_code == 201, resp.text


def test_register_then_login_returns_a_token(client: TestClient) -> None:
    _register(client)
    resp = client.post("/api/auth/login", json={"username": "alice", "password": "Sup3rSecret!"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and len(body["access_token"]) > 20


def test_register_does_not_echo_password(client: TestClient) -> None:
    resp = client.post("/api/auth/register", json={"username": "bob", "password": "Sup3rSecret!"})
    body = resp.json()
    assert "password" not in body
    assert "password_hash" not in body
    assert body["username"] == "bob"


def test_duplicate_username_is_rejected(client: TestClient) -> None:
    _register(client, "carol")
    resp = client.post("/api/auth/register", json={"username": "carol", "password": "Another1!"})
    assert resp.status_code == 409


def test_login_with_wrong_password_is_401(client: TestClient) -> None:
    _register(client, "dave")
    resp = client.post("/api/auth/login", json={"username": "dave", "password": "wrong-password"})
    assert resp.status_code == 401


def test_login_unknown_user_is_401(client: TestClient) -> None:
    resp = client.post("/api/auth/login", json={"username": "ghost", "password": "whatever12"})
    assert resp.status_code == 401


def test_short_password_is_rejected_by_validation(client: TestClient) -> None:
    resp = client.post("/api/auth/register", json={"username": "eve", "password": "short"})
    assert resp.status_code == 422


def test_me_returns_the_authenticated_user(client: TestClient) -> None:
    _register(client, "frank")
    token = client.post(
        "/api/auth/login", json={"username": "frank", "password": "Sup3rSecret!"}
    ).json()["access_token"]
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "frank"


def test_me_without_token_is_401(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_logout_invalidates_the_token(client: TestClient) -> None:
    _register(client, "grace")
    token = client.post(
        "/api/auth/login", json={"username": "grace", "password": "Sup3rSecret!"}
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_rate_limit_trips_after_configured_attempts(client: TestClient) -> None:
    # Default limit is 10 attempts/window; the 11th from the same client is 429.
    last_status = None
    for _ in range(11):
        last_status = client.post(
            "/api/auth/login", json={"username": "nobody", "password": "whatever12"}
        ).status_code
    assert last_status == 429


def test_local_token_authorizes_data_endpoints(db_session: Session) -> None:
    """The real (non-overridden) get_current_user_id resolves a local token and
    scopes data access to that user — the end-to-end local auth path."""
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides.pop(get_current_user_id, None)  # use the real resolver
    try:
        c = TestClient(app)
        c.post("/api/auth/register", json={"username": "heidi", "password": "Sup3rSecret!"})
        token = c.post(
            "/api/auth/login", json={"username": "heidi", "password": "Sup3rSecret!"}
        ).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # No token → 401.
        assert c.get("/api/expenses").status_code == 401
        # With the local token → create + list works, scoped to this user.
        created = c.post(
            "/api/expenses",
            json={"category": "Food & Dining", "amount": "12.50"},
            headers=headers,
        )
        assert created.status_code == 201, created.text
        listed = c.get("/api/expenses", headers=headers)
        assert listed.status_code == 200
        assert listed.json()["total"] == 1
    finally:
        app.dependency_overrides.clear()
