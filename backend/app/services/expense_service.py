"""Expense business logic — category validation, default date (BR-02), and
uniform 404-not-403 for missing-or-not-yours records (BR-13)."""

import uuid
from datetime import UTC, date, datetime

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, UnprocessableEntityError
from app.models.expense import Expense
from app.repositories import category_repo, expense_repo
from app.schemas.common import Page
from app.schemas.expense import ExpenseCreate, ExpenseRead, ExpenseUpdate


def _to_read(expense: Expense) -> ExpenseRead:
    return ExpenseRead.model_validate(expense)


def list_expenses(
    db: Session,
    user_id: str,
    *,
    category: str | None,
    date_from: date | None,
    date_to: date | None,
    page: int,
    page_size: int,
) -> Page[ExpenseRead]:
    rows, total = expense_repo.list_expenses(
        db,
        user_id,
        category=category,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    return Page[ExpenseRead](
        items=[_to_read(row) for row in rows], total=total, page=page, page_size=page_size
    )


def get_expense(db: Session, user_id: str, expense_id: uuid.UUID) -> ExpenseRead:
    expense = expense_repo.get_expense(db, user_id, expense_id)
    if expense is None:
        raise NotFoundError("Expense not found")
    return _to_read(expense)


def create_expense(db: Session, user_id: str, data: ExpenseCreate) -> ExpenseRead:
    if not category_repo.is_valid_category_for_user(db, user_id, data.category):
        raise UnprocessableEntityError(f"Unknown category: {data.category!r}")
    resolved_date = data.date or datetime.now(UTC).date()
    expense = expense_repo.create_expense(
        db,
        user_id,
        category=data.category,
        amount=data.amount,
        resolved_date=resolved_date,
        description=data.description,
    )
    return _to_read(expense)


def update_expense(
    db: Session, user_id: str, expense_id: uuid.UUID, data: ExpenseUpdate
) -> ExpenseRead:
    if data.category is not None and not category_repo.is_valid_category_for_user(
        db, user_id, data.category
    ):
        raise UnprocessableEntityError(f"Unknown category: {data.category!r}")
    expense = expense_repo.update_expense(db, user_id, expense_id, data)
    if expense is None:
        raise NotFoundError("Expense not found")
    return _to_read(expense)


def delete_expense(db: Session, user_id: str, expense_id: uuid.UUID) -> None:
    deleted = expense_repo.delete_expense(db, user_id, expense_id)
    if not deleted:
        raise NotFoundError("Expense not found")
