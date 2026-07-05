"""Investment — same user_id-first filtering discipline as Expense (TR-DAT-01).

`type` is free-text, not FK'd to a table — matches current app behavior; no BR
requires structured investment types (see IMPLEMENTATION-PLAN.md note near
IMPL-BE-07)."""

import datetime
import uuid
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, Index, Numeric, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Investment(Base, TimestampMixin):
    __tablename__ = "investments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_investments_amount_positive"),
        CheckConstraint("current_value >= 0", name="ck_investments_current_value_non_negative"),
        Index(
            "ix_investments_user_id_purchase_date",
            "user_id",
            "purchase_date",
            postgresql_ops={"purchase_date": "DESC"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    current_value: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    purchase_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
