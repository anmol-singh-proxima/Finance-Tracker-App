"""Expense — every query against this table must filter by user_id first
(enforced in app/repositories/expense_repo.py, not here — TR-DAT-01)."""

import datetime
import uuid
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, Index, Numeric, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
        # user_id leads both composite indexes since every query filters by it first.
        Index("ix_expenses_user_id_date", "user_id", "date", postgresql_ops={"date": "DESC"}),
        Index("ix_expenses_user_id_category", "user_id", "category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
