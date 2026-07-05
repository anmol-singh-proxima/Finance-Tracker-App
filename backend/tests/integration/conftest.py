"""Integration-test fixtures: real Postgres (a dedicated test database), a
full FastAPI TestClient, with auth bypassed via dependency_overrides — real
JWT/JWKS verification is covered separately and fully offline in
tests/unit/test_security.py, so this layer never touches real crypto or
Cognito. Uses Postgres (not SQLite) because the dashboard trend endpoint
relies on Postgres-specific date_trunc/NUMERIC behavior (TR-REL-01: don't
introduce a code path that never runs against the real engine)."""

from collections.abc import Generator, Iterator
from contextlib import contextmanager
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import get_current_user_id, get_db
from app.db.session import engine
from app.main import app

TEST_USER_SUB = "integration-test-user-1"
OTHER_USER_SUB = "integration-test-user-2"

_BACKEND_ROOT = Path(__file__).resolve().parents[2]

SessionForTests = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(scope="session", autouse=True)
def _run_migrations() -> None:
    config = Config(str(_BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(_BACKEND_ROOT / "app" / "db" / "migrations"))
    command.upgrade(config, "head")


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    session = SessionForTests()
    try:
        yield session
    finally:
        session.rollback()
        session.execute(text("TRUNCATE expenses, investments RESTART IDENTITY CASCADE"))
        session.execute(text("DELETE FROM categories WHERE is_predefined = false"))
        session.commit()
        session.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_SUB
    yield TestClient(app)
    app.dependency_overrides.clear()


@contextmanager
def as_user(sub: str) -> Iterator[None]:
    """Temporarily makes `client` act as a different user, for the duration
    of the `with` block. Needed because a TestClient wraps the *same* `app`
    singleton, so the override must be swapped around each request rather
    than baked into a second, separately-constructed client fixture."""
    previous = app.dependency_overrides.get(get_current_user_id)
    app.dependency_overrides[get_current_user_id] = lambda: sub
    try:
        yield
    finally:
        if previous is not None:
            app.dependency_overrides[get_current_user_id] = previous
        else:
            app.dependency_overrides.pop(get_current_user_id, None)
