"""Local auth provider business logic (AUTH_PROVIDER=local, TR-SEC-01L).

Registration hashes the password (bcrypt); login verifies it and issues an
opaque session token whose SHA-256 hash is stored. Every DB access here is
ORM-parameterized (no string-built SQL), so the open endpoints that call this
are not an injection vector (TR-SEC-05).
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ConflictError
from app.core.passwords import hash_password, verify_password
from app.models.auth_session import AuthSession
from app.models.user import User
from app.schemas.auth import RegisterRequest

_TOKEN_BYTES = 32


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def register(db: Session, data: RegisterRequest) -> User:
    existing = db.scalar(select(User).where(User.username == data.username))
    if existing is not None:
        raise ConflictError("Username is already taken")
    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, username: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.username == username))
    if user is None:
        # Still run a hash verify against a dummy value to reduce username-
        # enumeration timing signal, then return None.
        verify_password(password, "$2b$12$" + "x" * 53)
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_session(db: Session, user: User) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(_TOKEN_BYTES)
    expires_at = datetime.now(UTC) + timedelta(hours=settings.local_session_ttl_hours)
    db.add(AuthSession(user_id=user.id, token_hash=_hash_token(token), expires_at=expires_at))
    db.commit()
    return token, expires_at


def resolve_token(db: Session, token: str) -> str | None:
    """Return the owning user's id (as a string) for a valid, unexpired token,
    or None. This is what the auth dependency scopes data access to."""
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == _hash_token(token)))
    if session is None:
        return None
    if session.expires_at <= datetime.now(UTC):
        return None
    return str(session.user_id)


def logout(db: Session, token: str) -> None:
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == _hash_token(token)))
    if session is not None:
        db.delete(session)
        db.commit()


def get_user(db: Session, user_id: str) -> User | None:
    try:
        parsed = uuid.UUID(user_id)
    except ValueError:
        return None
    return db.get(User, parsed)
