"""Category — predefined (user_id IS NULL) or a user's own custom category.

Each category has a `type` ('expense' | 'investment', BR-18) so each module
only offers its own categories, and an optional single-level hierarchy via
`parent_id` (a self-referencing FK; subcategories cannot themselves be
parents — enforced in the service layer, not the schema).

No local `users` table exists (see IMPLEMENTATION-PLAN.md's note near IMPL-BE-07):
`user_id` is simply the Cognito `sub` string, with no foreign key.

The case-insensitive-per-user-per-type uniqueness constraint
(`UNIQUE (user_id, type, lower(name)) NULLS NOT DISTINCT`) is declared as raw
DDL in the Alembic migrations, not here — see
app/db/migrations/versions/0003_category_types_hierarchy.py. It's
Postgres-15-specific syntax that's clearer to hand-author once in the
migration than to encode via SQLAlchemy Core constructs.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

EXPENSE_TYPE = "expense"
INVESTMENT_TYPE = "investment"


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        Index("ix_categories_user_id", "user_id"),
        Index("ix_categories_parent_id", "parent_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False, server_default=EXPENSE_TYPE)
    # RESTRICT (not CASCADE): deleting a parent that still has subcategories is
    # a service-layer error with a clear message, never a silent cascade (BR-18).
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=True
    )
    is_predefined: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
