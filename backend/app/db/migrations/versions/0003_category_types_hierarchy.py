"""Category types + single-level hierarchy (BR-18).

- `type` ('expense' | 'investment') so each module offers only its own
  categories; existing rows (all expense categories) default to 'expense'.
- `parent_id` self-referencing FK (ON DELETE RESTRICT) for one-level
  subcategories.
- The per-user case-insensitive name uniqueness becomes per-user **per type**
  (an expense "Other" and an investment "Other" may coexist).
- Seeds the predefined investment categories and normalises the legacy
  investments.type values (the old frontend sent lowercase keys like
  'mutual-funds') to those category names, so investment records reference
  categories by exact name the same way expenses do.

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-12
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: Sequence[str] | str | None = None
depends_on: Sequence[str] | str | None = None

_PREDEFINED_INVESTMENT_CATEGORIES = [
    "Stocks",
    "Bonds",
    "Mutual Funds",
    "ETF",
    "Cryptocurrency",
    "Real Estate",
    "Other",
]

# Legacy frontend dropdown keys → seeded category names.
_LEGACY_INVESTMENT_TYPE_MAP = {
    "stocks": "Stocks",
    "bonds": "Bonds",
    "mutual-funds": "Mutual Funds",
    "etf": "ETF",
    "crypto": "Cryptocurrency",
    "real-estate": "Real Estate",
    "other": "Other",
}


def upgrade() -> None:
    op.add_column(
        "categories",
        sa.Column("type", sa.String(length=16), nullable=False, server_default="expense"),
    )
    op.create_check_constraint(
        "ck_categories_type", "categories", "type IN ('expense', 'investment')"
    )
    op.add_column(
        "categories",
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("categories.id", ondelete="RESTRICT", name="fk_categories_parent_id"),
            nullable=True,
        ),
    )
    op.create_index("ix_categories_parent_id", "categories", ["parent_id"])

    # Name uniqueness is now scoped per type as well as per user.
    op.execute("DROP INDEX IF EXISTS uq_categories_user_id_name_lower")
    op.execute(
        "CREATE UNIQUE INDEX uq_categories_user_id_type_name_lower "
        "ON categories (user_id, type, lower(name)) NULLS NOT DISTINCT"
    )

    categories_table = sa.table(
        "categories",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("user_id", sa.String),
        sa.column("name", sa.String),
        sa.column("type", sa.String),
        sa.column("is_predefined", sa.Boolean),
    )
    op.bulk_insert(
        categories_table,
        [
            {
                "id": uuid.uuid4(),
                "user_id": None,
                "name": name,
                "type": "investment",
                "is_predefined": True,
            }
            for name in _PREDEFINED_INVESTMENT_CATEGORIES
        ],
    )

    for legacy, name in _LEGACY_INVESTMENT_TYPE_MAP.items():
        op.execute(
            sa.text("UPDATE investments SET type = :name WHERE type = :legacy").bindparams(
                name=name, legacy=legacy
            )
        )


def downgrade() -> None:
    for legacy, name in _LEGACY_INVESTMENT_TYPE_MAP.items():
        op.execute(
            sa.text("UPDATE investments SET type = :legacy WHERE type = :name").bindparams(
                name=name, legacy=legacy
            )
        )
    op.execute("DELETE FROM categories WHERE type = 'investment' AND is_predefined = true")
    op.execute("DROP INDEX IF EXISTS uq_categories_user_id_type_name_lower")
    op.execute(
        "CREATE UNIQUE INDEX uq_categories_user_id_name_lower "
        "ON categories (user_id, lower(name)) NULLS NOT DISTINCT"
    )
    op.drop_index("ix_categories_parent_id", table_name="categories")
    op.drop_column("categories", "parent_id")
    op.drop_constraint("ck_categories_type", "categories")
    op.drop_column("categories", "type")
