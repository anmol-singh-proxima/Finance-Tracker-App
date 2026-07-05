"""investment_service business-logic tests using a hand-written in-memory
fake repository (TR-CQ-03) — independent of the DB. Full HTTP+DB behavior is
covered by tests/integration/test_investments_api.py."""

import uuid
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any, cast

import pytest
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.schemas.investment import InvestmentCreate, InvestmentUpdate
from app.services import investment_service

# The fake repo never touches `db` — it's cast, not a real Session, purely so
# service function signatures (db: Session) can stay strictly typed without
# widening to `Session | None` just to accommodate this test double.
FAKE_DB = cast(Session, None)


@dataclass
class _FakeInvestmentRow:
    id: uuid.UUID
    user_id: str
    name: str
    type: str
    amount: Decimal
    current_value: Decimal
    purchase_date: date
    notes: str | None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class _FakeInvestmentRepo:
    def __init__(self) -> None:
        self.rows: dict[uuid.UUID, _FakeInvestmentRow] = {}

    def create_investment(
        self, db: Any, user_id: str, data: InvestmentCreate
    ) -> _FakeInvestmentRow:
        row = _FakeInvestmentRow(
            uuid.uuid4(),
            user_id,
            data.name,
            data.type,
            data.amount,
            data.current_value,
            data.purchase_date,
            data.notes,
        )
        self.rows[row.id] = row
        return row

    def get_investment(
        self, db: Any, user_id: str, investment_id: uuid.UUID
    ) -> _FakeInvestmentRow | None:
        row = self.rows.get(investment_id)
        return row if row is not None and row.user_id == user_id else None

    def update_investment(
        self, db: Any, user_id: str, investment_id: uuid.UUID, data: InvestmentUpdate
    ) -> _FakeInvestmentRow | None:
        row = self.get_investment(db, user_id, investment_id)
        if row is None:
            return None
        for field_name, value in data.model_dump(exclude_unset=True).items():
            setattr(row, field_name, value)
        return row

    def delete_investment(self, db: Any, user_id: str, investment_id: uuid.UUID) -> bool:
        row = self.get_investment(db, user_id, investment_id)
        if row is None:
            return False
        del self.rows[row.id]
        return True


USER = "svc-test-user"


def _make_data(**overrides: object) -> InvestmentCreate:
    defaults: dict[str, object] = {
        "name": "Index Fund",
        "type": "etf",
        "amount": Decimal("1000"),
        "current_value": Decimal("1100"),
        "purchase_date": date(2026, 1, 1),
    }
    defaults.update(overrides)
    return InvestmentCreate(**defaults)


@pytest.fixture
def fake_investment_repo(monkeypatch: pytest.MonkeyPatch) -> _FakeInvestmentRepo:
    fake = _FakeInvestmentRepo()
    monkeypatch.setattr(investment_service, "investment_repo", fake)
    return fake


def test_create_investment(fake_investment_repo: _FakeInvestmentRepo) -> None:
    created = investment_service.create_investment(db=FAKE_DB, user_id=USER, data=_make_data())
    assert created.name == "Index Fund"
    assert created.current_value == Decimal("1100")


def test_get_missing_investment_raises_not_found(fake_investment_repo: _FakeInvestmentRepo) -> None:
    with pytest.raises(NotFoundError):
        investment_service.get_investment(db=FAKE_DB, user_id=USER, investment_id=uuid.uuid4())


def test_get_another_users_investment_raises_not_found(
    fake_investment_repo: _FakeInvestmentRepo,
) -> None:
    created = investment_service.create_investment(db=FAKE_DB, user_id=USER, data=_make_data())
    with pytest.raises(NotFoundError):
        investment_service.get_investment(
            db=FAKE_DB, user_id="a-different-user", investment_id=created.id
        )


def test_update_only_changes_given_fields(fake_investment_repo: _FakeInvestmentRepo) -> None:
    created = investment_service.create_investment(db=FAKE_DB, user_id=USER, data=_make_data())
    updated = investment_service.update_investment(
        db=FAKE_DB,
        user_id=USER,
        investment_id=created.id,
        data=InvestmentUpdate(current_value=Decimal("1250")),
    )
    assert updated.current_value == Decimal("1250")
    assert updated.name == created.name


def test_update_missing_investment_raises_not_found(
    fake_investment_repo: _FakeInvestmentRepo,
) -> None:
    with pytest.raises(NotFoundError):
        investment_service.update_investment(
            db=FAKE_DB,
            user_id=USER,
            investment_id=uuid.uuid4(),
            data=InvestmentUpdate(current_value=Decimal("1")),
        )


def test_delete_missing_investment_raises_not_found(
    fake_investment_repo: _FakeInvestmentRepo,
) -> None:
    with pytest.raises(NotFoundError):
        investment_service.delete_investment(db=FAKE_DB, user_id=USER, investment_id=uuid.uuid4())


def test_delete_removes_investment(fake_investment_repo: _FakeInvestmentRepo) -> None:
    created = investment_service.create_investment(db=FAKE_DB, user_id=USER, data=_make_data())
    investment_service.delete_investment(db=FAKE_DB, user_id=USER, investment_id=created.id)
    with pytest.raises(NotFoundError):
        investment_service.get_investment(db=FAKE_DB, user_id=USER, investment_id=created.id)
