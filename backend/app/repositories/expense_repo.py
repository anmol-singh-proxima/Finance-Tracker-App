"""All expense DB access. Every function's first filter is `user_id` — this
is the actual enforcement point for BR-13/TR-DAT-01, independent of whether
the service layer above also checks (defense in depth)."""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.schemas.expense import ExpenseUpdate


def list_expenses(
    db: Session,
    user_id: str,
    *,
    category: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Expense], int]:
    stmt = select(Expense).where(Expense.user_id == user_id)
    if category is not None:
        stmt = stmt.where(Expense.category == category)
    if date_from is not None:
        stmt = stmt.where(Expense.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Expense.date <= date_to)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    stmt = stmt.order_by(Expense.date.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = list(db.scalars(stmt).all())
    return rows, total


def get_expense(db: Session, user_id: str, expense_id: uuid.UUID) -> Expense | None:
    stmt = select(Expense).where(Expense.user_id == user_id, Expense.id == expense_id)
    return db.scalar(stmt)


def create_expense(
    db: Session,
    user_id: str,
    *,
    category: str,
    amount: Decimal,
    resolved_date: date,
    description: str | None,
) -> Expense:
    expense = Expense(
        user_id=user_id,
        category=category,
        amount=amount,
        date=resolved_date,
        description=description,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def update_expense(
    db: Session, user_id: str, expense_id: uuid.UUID, data: ExpenseUpdate
) -> Expense | None:
    expense = get_expense(db, user_id, expense_id)
    if expense is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, user_id: str, expense_id: uuid.UUID) -> bool:
    expense = get_expense(db, user_id, expense_id)
    if expense is None:
        return False
    db.delete(expense)
    db.commit()
    return True
