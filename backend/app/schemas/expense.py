"""Expense request/response schemas. Validation lives here, at the API
boundary (TR-SEC-04) — services and repositories trust these shapes."""

import uuid
from datetime import date as date_
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

# The field below is named `date`, same as the stdlib type — importing it
# under a distinct name (`date_`) avoids a real bug: Pydantic resolves the
# `date: date | None` annotation in a namespace where the class's own `date`
# attribute (value `None`) shadows the imported type, raising
# `TypeError: unsupported operand type(s) for |: 'NoneType' and 'NoneType'`
# at class-definition time. The wire/JSON field name stays `date` either way.


class ExpenseCreate(BaseModel):
    category: str = Field(min_length=1, max_length=64)
    amount: Decimal = Field(gt=0, le=10_000_000)
    date: date_ | None = None  # defaults to today in expense_service (BR-02)
    description: str | None = Field(default=None, max_length=1000)


class ExpenseUpdate(BaseModel):
    category: str | None = Field(default=None, min_length=1, max_length=64)
    amount: Decimal | None = Field(default=None, gt=0, le=10_000_000)
    date: date_ | None = None
    description: str | None = Field(default=None, max_length=1000)


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: str
    amount: Decimal
    date: date_
    description: str | None
    created_at: datetime
    updated_at: datetime
