"""Local auth provider HTTP endpoints (AUTH_PROVIDER=local only).

These are the app's only *open* (unauthenticated) endpoints, so they are
rate-limited per client IP to blunt brute-force/DDoS (TR-SEC-01L). In the
cognito profile this router is not mounted at all (Cognito owns sign-up/in),
so there is no unauthenticated surface in production.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.rate_limit import SlidingWindowRateLimiter
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserRead
from app.services import local_auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

_limiter = SlidingWindowRateLimiter(
    max_attempts=settings.auth_rate_limit_max_attempts,
    window_seconds=settings.auth_rate_limit_window_seconds,
)


def _enforce_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    if not _limiter.check(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts; please wait and try again.",
        )


def _bearer_token(authorization: str | None) -> str:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return token


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> UserRead:
    _enforce_rate_limit(request)
    user = local_auth_service.register(db, data)
    return UserRead.model_validate(user, from_attributes=True)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    _enforce_rate_limit(request)
    user = local_auth_service.authenticate(db, data.username, data.password)
    if user is None:
        # One generic message for unknown-user and wrong-password (TR-SEC-10).
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token, expires_at = local_auth_service.create_session(db, user)
    return TokenResponse(access_token=token, expires_at=expires_at)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> None:
    local_auth_service.logout(db, _bearer_token(authorization))


@router.get("/me", response_model=UserRead)
def me(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> UserRead:
    token = _bearer_token(authorization)
    user_id = local_auth_service.resolve_token(db, token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    user = local_auth_service.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    return UserRead.model_validate(user, from_attributes=True)
