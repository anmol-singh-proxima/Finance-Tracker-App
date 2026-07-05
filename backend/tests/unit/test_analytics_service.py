"""Pure date-math helpers in analytics_service. The SQL aggregation logic
itself (get_summary/get_trends/get_breakdown) executes real SQLAlchemy
statements against a Session, so it's exercised via real Postgres in
tests/integration/test_dashboard_api.py instead of faked here — hand-rolling
a fake that replicates SQL GROUP BY/date_trunc semantics wouldn't actually
test anything real (TR-CQ-03)."""

from datetime import date

from app.services.analytics_service import _month_start, _shift_months


def test_month_start_returns_first_of_month() -> None:
    assert _month_start(date(2026, 7, 15)) == date(2026, 7, 1)


def test_month_start_is_idempotent_on_first_of_month() -> None:
    assert _month_start(date(2026, 7, 1)) == date(2026, 7, 1)


def test_shift_months_forward() -> None:
    assert _shift_months(date(2026, 1, 1), 2) == date(2026, 3, 1)


def test_shift_months_backward() -> None:
    assert _shift_months(date(2026, 3, 1), -2) == date(2026, 1, 1)


def test_shift_months_crosses_year_boundary_forward() -> None:
    assert _shift_months(date(2025, 11, 1), 3) == date(2026, 2, 1)


def test_shift_months_crosses_year_boundary_backward() -> None:
    assert _shift_months(date(2026, 2, 1), -3) == date(2025, 11, 1)


def test_shift_months_zero_is_identity() -> None:
    assert _shift_months(date(2026, 6, 1), 0) == date(2026, 6, 1)
