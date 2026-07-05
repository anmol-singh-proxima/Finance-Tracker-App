"""Dashboard/analytics response schemas (BR-07/08/09)."""

from decimal import Decimal

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_expenses_this_period: Decimal
    total_invested: Decimal
    total_current_value: Decimal
    total_returns: Decimal
    net_worth: Decimal
    expense_count: int
    investment_count: int
    roi: float


class TrendPoint(BaseModel):
    period: str
    total: Decimal


class TrendResponse(BaseModel):
    points: list[TrendPoint]


class CategoryBreakdownItem(BaseModel):
    category: str
    total: Decimal
    percentage: float


class BreakdownResponse(BaseModel):
    items: list[CategoryBreakdownItem]
