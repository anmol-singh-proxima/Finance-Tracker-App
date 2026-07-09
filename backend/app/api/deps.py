"""FastAPI dependencies shared across routers.

`get_current_user_id` is the sole enforcement point that a caller is who they
claim to be (TR-SEC-02). It resolves the caller's id from the configured auth
provider — a verified Cognito `sub` (staging/prod) or a local session token
(local dev) — and that id, never a client-supplied field, is what every
service/repository call scopes data access to.
"""

from collections.abc import Generator

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import TokenVerificationError, verify_access_token
from app.db.session import get_session
from app.services import local_auth_service

_GENERIC_AUTH_ERROR = "Could not validate credentials"


def get_db() -> Generator[Session, None, None]:
    yield from get_session()


def _bearer_token(authorization: str | None) -> str:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail=_GENERIC_AUTH_ERROR)
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail=_GENERIC_AUTH_ERROR)
    return token


def get_current_user_id(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> str:
    token = _bearer_token(authorization)

    if settings.auth_provider == "cognito":
        try:
            return verify_access_token(token).sub
        except TokenVerificationError as exc:
            # Specific reason stays server-side (TR-SEC-10).
            raise HTTPException(status_code=401, detail=_GENERIC_AUTH_ERROR) from exc

    # Local provider: opaque session token resolved against the DB.
    user_id = local_auth_service.resolve_token(db, token)
    if user_id is None:
        raise HTTPException(status_code=401, detail=_GENERIC_AUTH_ERROR)
    return user_id
