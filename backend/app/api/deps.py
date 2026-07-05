"""FastAPI dependencies shared across routers."""

from collections.abc import Generator

from fastapi import Header, HTTPException
from sqlalchemy.orm import Session

from app.core.security import TokenVerificationError, verify_access_token
from app.db.session import get_session

_GENERIC_AUTH_ERROR = "Could not validate credentials"


def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    """Returns the verified Cognito `sub` for the caller, or raises 401.

    This is the sole enforcement point that a caller is who they claim to be
    (TR-SEC-02). The identity returned here — never a client-supplied field —
    is what every service/repository call below scopes data access to.
    """
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail=_GENERIC_AUTH_ERROR)

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail=_GENERIC_AUTH_ERROR)

    try:
        claims = verify_access_token(token)
    except TokenVerificationError as exc:
        # The specific reason is not exposed to the client (TR-SEC-10); it's
        # available server-side via the exception message if logged by the
        # caller of this dependency (FastAPI's default exception logging).
        raise HTTPException(status_code=401, detail=_GENERIC_AUTH_ERROR) from exc

    return claims.sub


def get_db() -> Generator[Session, None, None]:
    yield from get_session()
