"""Dashboard aggregations (BR-07/08/09) — each computed via one SQL aggregate
query, never by looping over full result sets in Python (TR-PERF-05)."""

from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.investment import Investment
from app.schemas.dashboard import (
    BreakdownResponse,
    CategoryBreakdownItem,
    DashboardSummary,
    TrendPoint,
    TrendResponse,
)

Period = Literal["month", "year", "all"]


def _month_start(d: date) -> date:
    return d.replace(day=1)


def _shift_months(d: date, delta: int) -> date:
    """`d` must be the first of a month. Returns the first-of-month `delta`
    months away. Plain arithmetic — not worth a new dependency (dateutil) for
    this one calculation (TR-CQ-03)."""
    total = d.year * 12 + (d.month - 1) + delta
    year, month0 = divmod(total, 12)
    return date(year, month0 + 1, 1)


def get_summary(db: Session, user_id: str, period: Period) -> DashboardSummary:
    today = datetime.now(UTC).date()
    if period == "month":
        period_start = _month_start(today)
    elif period == "year":
        period_start = date(today.year, 1, 1)
    else:
        period_start = date.min

    expense_row = db.execute(
        select(
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
            func.count().label("count"),
        ).where(Expense.user_id == user_id, Expense.date >= period_start)
    ).one()

    investment_row = db.execute(
        select(
            func.coalesce(func.sum(Investment.amount), 0).label("invested"),
            func.coalesce(func.sum(Investment.current_value), 0).label("current_value"),
            func.count().label("count"),
        ).where(Investment.user_id == user_id)
    ).one()

    total_expenses = Decimal(expense_row.total)
    total_invested = Decimal(investment_row.invested)
    total_current_value = Decimal(investment_row.current_value)
    total_returns = total_current_value - total_invested
    # net_worth intentionally matches the current server/src/routes/dashboard.js
    # formula exactly (current_value - expenses) — a documented parity choice,
    # not a redesign; changing what "net worth" means is a product decision
    # out of Phase 1's scope. See IMPLEMENTATION-PLAN.md's endpoint table note.
    net_worth = total_current_value - total_expenses
    roi = float(total_returns / total_invested * 100) if total_invested > 0 else 0.0

    return DashboardSummary(
        total_expenses_this_period=total_expenses,
        total_invested=total_invested,
        total_current_value=total_current_value,
        total_returns=total_returns,
        net_worth=net_worth,
        expense_count=expense_row.count,
        investment_count=investment_row.count,
        roi=roi,
    )


def get_trends(db: Session, user_id: str, months: int) -> TrendResponse:
    today = datetime.now(UTC).date()
    current_month_start = _month_start(today)
    earliest_month_start = _shift_months(current_month_start, -(months - 1))

    period_col = func.to_char(func.date_trunc("month", Expense.date), "YYYY-MM").label("period")
    rows = db.execute(
        select(period_col, func.sum(Expense.amount).label("total"))
        .where(Expense.user_id == user_id, Expense.date >= earliest_month_start)
        .group_by(period_col)
    )
    totals_by_period = {row.period: row.total for row in rows}

    points = []
    for i in range(months):
        month_start = _shift_months(earliest_month_start, i)
        key = f"{month_start.year:04d}-{month_start.month:02d}"
        points.append(TrendPoint(period=key, total=totals_by_period.get(key, Decimal("0"))))

    return TrendResponse(points=points)


def get_breakdown(
    db: Session, user_id: str, date_from: date | None, date_to: date | None
) -> BreakdownResponse:
    if date_from is None and date_to is None:
        today = datetime.now(UTC).date()
        date_from = _month_start(today)
        date_to = today
    else:
        date_from = date_from or date.min
        date_to = date_to or date.max

    rows = list(
        db.execute(
            select(Expense.category, func.sum(Expense.amount).label("total"))
            .where(
                Expense.user_id == user_id,
                Expense.date >= date_from,
                Expense.date <= date_to,
            )
            .group_by(Expense.category)
            .order_by(func.sum(Expense.amount).desc())
        )
    )
    grand_total = sum((row.total for row in rows), Decimal("0"))

    items = [
        CategoryBreakdownItem(
            category=row.category,
            total=row.total,
            percentage=(round(float(row.total / grand_total * 100), 1) if grand_total > 0 else 0.0),
        )
        for row in rows
    ]
    return BreakdownResponse(items=items)
