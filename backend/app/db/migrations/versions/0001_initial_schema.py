"""Initial schema: categories, expenses, investments.

Revision ID: 0001
Revises:
Create Date: 2026-07-01
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: Sequence[str] | str | None = None
depends_on: Sequence[str] | str | None = None

# (value_key, display_name) — matches frontend/src/pages/Expenses.jsx's current dropdown.
_PREDEFINED_CATEGORIES = [
    "Food & Dining",
    "Transportation",
    "Utilities",
    "Entertainment",
    "Health & Medical",
    "Shopping",
    "Other",
]


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "categories",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("is_predefined", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_categories_user_id", "categories", ["user_id"])
    # Postgres 15+ NULLS NOT DISTINCT so two predefined categories (both
    # user_id IS NULL) can't collide on name either, not just two rows for the
    # same user. Hand-authored DDL — see app/models/category.py docstring.
    op.execute(
        "CREATE UNIQUE INDEX uq_categories_user_id_name_lower "
        "ON categories (user_id, lower(name)) NULLS NOT DISTINCT"
    )

    op.create_table(
        "expenses",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
    )
    op.execute("CREATE INDEX ix_expenses_user_id_date ON expenses (user_id, date DESC)")
    op.create_index("ix_expenses_user_id_category", "expenses", ["user_id", "category"])

    op.create_table(
        "investments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("current_value", sa.Numeric(14, 2), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("amount > 0", name="ck_investments_amount_positive"),
        sa.CheckConstraint("current_value >= 0", name="ck_investments_current_value_non_negative"),
    )
    op.execute(
        "CREATE INDEX ix_investments_user_id_purchase_date "
        "ON investments (user_id, purchase_date DESC)"
    )

    categories_table = sa.table(
        "categories",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("user_id", sa.String),
        sa.column("name", sa.String),
        sa.column("is_predefined", sa.Boolean),
    )
    op.bulk_insert(
        categories_table,
        [
            {"id": uuid.uuid4(), "user_id": None, "name": name, "is_predefined": True}
            for name in _PREDEFINED_CATEGORIES
        ],
    )


def downgrade() -> None:
    op.drop_table("investments")
    op.drop_table("expenses")
    op.execute("DROP INDEX IF EXISTS uq_categories_user_id_name_lower")
    op.drop_table("categories")
