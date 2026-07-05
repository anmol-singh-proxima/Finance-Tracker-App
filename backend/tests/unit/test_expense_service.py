"""expense_service business-logic tests using a hand-written in-memory fake
repository — not a mock framework (TR-CQ-03) — independent of the DB. Full
HTTP+DB behavior (status codes, actual persistence) is covered by
tests/integration/test_expenses_api.py."""

import uuid
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any, cast

import pytest
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, UnprocessableEntityError
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.services import expense_service

# The fake repo never touches `db` — it's cast, not a real Session, purely so
# service function signatures (db: Session) can stay strictly typed without
# widening to `Session | None` just to accommodate this test double.
FAKE_DB = cast(Session, None)


@dataclass
class _FakeExpenseRow:
    id: uuid.UUID
    user_id: str
    category: str
    amount: Decimal
    date: date
    description: str | None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class _FakeExpenseRepo:
    def __init__(self) -> None:
        self.rows: dict[uuid.UUID, _FakeExpenseRow] = {}

    def create_expense(
        self,
        db: Any,
        user_id: str,
        *,
        category: str,
        amount: Decimal,
        resolved_date: date,
        description: str | None,
    ) -> _FakeExpenseRow:
        row = _FakeExpenseRow(uuid.uuid4(), user_id, category, amount, resolved_date, description)
        self.rows[row.id] = row
        return row

    def get_expense(self, db: Any, user_id: str, expense_id: uuid.UUID) -> _FakeExpenseRow | None:
        row = self.rows.get(expense_id)
        return row if row is not None and row.user_id == user_id else None

    def update_expense(
        self, db: Any, user_id: str, expense_id: uuid.UUID, data: ExpenseUpdate
    ) -> _FakeExpenseRow | None:
        row = self.get_expense(db, user_id, expense_id)
        if row is None:
            return None
        for field_name, value in data.model_dump(exclude_unset=True).items():
            setattr(row, field_name, value)
        return row

    def delete_expense(self, db: Any, user_id: str, expense_id: uuid.UUID) -> bool:
        row = self.get_expense(db, user_id, expense_id)
        if row is None:
            return False
        del self.rows[row.id]
        return True


class _FakeCategoryRepo:
    def __init__(self, valid_names: set[str]) -> None:
        self.valid_names = valid_names

    def is_valid_category_for_user(self, db: Any, user_id: str, name: str) -> bool:
        return name in self.valid_names


USER = "svc-test-user"


@pytest.fixture
def fake_expense_repo(monkeypatch: pytest.MonkeyPatch) -> _FakeExpenseRepo:
    fake = _FakeExpenseRepo()
    monkeypatch.setattr(expense_service, "expense_repo", fake)
    monkeypatch.setattr(
        expense_service,
        "category_repo",
        _FakeCategoryRepo(valid_names={"Food & Dining", "Shopping"}),
    )
    return fake


def test_create_defaults_date_to_today_when_omitted(fake_expense_repo: _FakeExpenseRepo) -> None:
    created = expense_service.create_expense(
        db=FAKE_DB, user_id=USER, data=ExpenseCreate(category="Food & Dining", amount=Decimal("10"))
    )
    assert created.date == date.today()


def test_create_preserves_explicit_date(fake_expense_repo: _FakeExpenseRepo) -> None:
    explicit_date = date.today() - timedelta(days=5)
    created = expense_service.create_expense(
        db=FAKE_DB,
        user_id=USER,
        data=ExpenseCreate(category="Food & Dining", amount=Decimal("10"), date=explicit_date),
    )
    assert created.date == explicit_date


def test_create_with_unknown_category_raises(fake_expense_repo: _FakeExpenseRepo) -> None:
    with pytest.raises(UnprocessableEntityError):
        expense_service.create_expense(
            db=FAKE_DB, user_id=USER, data=ExpenseCreate(category="Not Real", amount=Decimal("10"))
        )


def test_get_missing_expense_raises_not_found(fake_expense_repo: _FakeExpenseRepo) -> None:
    with pytest.raises(NotFoundError):
        expense_service.get_expense(db=FAKE_DB, user_id=USER, expense_id=uuid.uuid4())


def test_get_another_users_expense_raises_not_found(fake_expense_repo: _FakeExpenseRepo) -> None:
    created = expense_service.create_expense(
        db=FAKE_DB, user_id=USER, data=ExpenseCreate(category="Food & Dining", amount=Decimal("10"))
    )
    with pytest.raises(NotFoundError):
        expense_service.get_expense(db=FAKE_DB, user_id="a-different-user", expense_id=created.id)


def test_update_only_changes_given_fields(fake_expense_repo: _FakeExpenseRepo) -> None:
    created = expense_service.create_expense(
        db=FAKE_DB,
        user_id=USER,
        data=ExpenseCreate(category="Food & Dining", amount=Decimal("10"), description="orig"),
    )
    updated = expense_service.update_expense(
        db=FAKE_DB, user_id=USER, expense_id=created.id, data=ExpenseUpdate(amount=Decimal("20"))
    )
    assert updated.amount == Decimal("20")
    assert updated.description == "orig"


def test_update_with_unknown_category_raises(fake_expense_repo: _FakeExpenseRepo) -> None:
    created = expense_service.create_expense(
        db=FAKE_DB, user_id=USER, data=ExpenseCreate(category="Food & Dining", amount=Decimal("10"))
    )
    with pytest.raises(UnprocessableEntityError):
        expense_service.update_expense(
            db=FAKE_DB, user_id=USER, expense_id=created.id, data=ExpenseUpdate(category="Not Real")
        )


def test_update_missing_expense_raises_not_found(fake_expense_repo: _FakeExpenseRepo) -> None:
    with pytest.raises(NotFoundError):
        expense_service.update_expense(
            db=FAKE_DB,
            user_id=USER,
            expense_id=uuid.uuid4(),
            data=ExpenseUpdate(amount=Decimal("1")),
        )


def test_delete_missing_expense_raises_not_found(fake_expense_repo: _FakeExpenseRepo) -> None:
    with pytest.raises(NotFoundError):
        expense_service.delete_expense(db=FAKE_DB, user_id=USER, expense_id=uuid.uuid4())


def test_delete_removes_expense(fake_expense_repo: _FakeExpenseRepo) -> None:
    created = expense_service.create_expense(
        db=FAKE_DB, user_id=USER, data=ExpenseCreate(category="Food & Dining", amount=Decimal("10"))
    )
    expense_service.delete_expense(db=FAKE_DB, user_id=USER, expense_id=created.id)
    with pytest.raises(NotFoundError):
        expense_service.get_expense(db=FAKE_DB, user_id=USER, expense_id=created.id)
