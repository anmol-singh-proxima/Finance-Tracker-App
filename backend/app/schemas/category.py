"""Category request/response schemas (BR-18)."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CategoryType = Literal["expense", "investment"]


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    type: CategoryType = "expense"
    parent_id: uuid.UUID | None = None


class CategoryUpdate(BaseModel):
    """`type` is deliberately absent: changing a category's type would silently
    re-label the expense/investment records referencing it, so type is
    immutable after creation. `parent_id` is tri-state (absent = keep,
    null = detach from parent, value = re-parent) — the service inspects
    `model_fields_set` to tell absent from null."""

    name: str | None = Field(default=None, min_length=1, max_length=64)
    parent_id: uuid.UUID | None = None


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: CategoryType
    parent_id: uuid.UUID | None
    is_predefined: bool
    created_at: datetime
    # How many of the caller's expense/investment records reference this
    # category (drives the UI's safe-delete affordance, BR-18).
    linked_count: int = 0
