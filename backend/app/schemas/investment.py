"""Investment request/response schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class InvestmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: str = Field(min_length=1, max_length=64)
    amount: Decimal = Field(gt=0, le=100_000_000)
    current_value: Decimal = Field(ge=0, le=100_000_000)
    purchase_date: date
    notes: str | None = Field(default=None, max_length=1000)


class InvestmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    type: str | None = Field(default=None, min_length=1, max_length=64)
    amount: Decimal | None = Field(default=None, gt=0, le=100_000_000)
    current_value: Decimal | None = Field(default=None, ge=0, le=100_000_000)
    purchase_date: date | None = None
    notes: str | None = Field(default=None, max_length=1000)


class InvestmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    amount: Decimal
    current_value: Decimal
    purchase_date: date
    notes: str | None
    created_at: datetime
    updated_at: datetime
