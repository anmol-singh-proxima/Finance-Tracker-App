"""Request/response schemas for the local auth provider (TR-SEC-04 validation
at the boundary). Only used when AUTH_PROVIDER=local."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)
    email: str | None = Field(default=None, max_length=320)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105 — OAuth token-type literal, not a secret
    expires_at: datetime


class UserRead(BaseModel):
    id: uuid.UUID
    username: str
    email: str | None
