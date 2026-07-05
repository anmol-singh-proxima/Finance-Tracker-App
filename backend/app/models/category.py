"""Category — predefined (user_id IS NULL) or a user's own custom category.

No local `users` table exists (see IMPLEMENTATION-PLAN.md's note near IMPL-BE-07):
`user_id` is simply the Cognito `sub` string, with no foreign key.

The case-insensitive-per-user uniqueness constraint (`UNIQUE (user_id, lower(name))
NULLS NOT DISTINCT`) is declared as raw DDL in the Alembic migration, not here —
see app/db/migrations/versions/0001_initial_schema.py. It's Postgres-15-specific
syntax that's clearer to hand-author once in the migration than to encode via
SQLAlchemy Core constructs.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (Index("ix_categories_user_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    is_predefined: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
