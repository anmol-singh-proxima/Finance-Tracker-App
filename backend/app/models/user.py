"""User — local auth provider only (AUTH_PROVIDER=local).

In the cognito profile this table is unused (identity is owned by Cognito); in
the local profile it holds the credentials the DB-backed auth checks against.
`id` is what downstream tables store in their `user_id` column, mirroring how a
Cognito `sub` is used in the cognito profile.
"""

import uuid

from sqlalchemy import String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    username: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    # bcrypt hash — never the plaintext password (TR-SEC-01L).
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
