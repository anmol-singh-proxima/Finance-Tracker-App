"""Expense HTTP endpoints — thin: parse params, call the service, return the
schema. No DB or business logic here (TR-CQ-03 layering)."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.common import Page
from app.schemas.expense import ExpenseCreate, ExpenseRead, ExpenseUpdate
from app.services import expense_service

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.get("", response_model=Page[ExpenseRead])
def list_expenses(
    category: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> Page[ExpenseRead]:
    return expense_service.list_expenses(
        db,
        user_id,
        category=category,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )


@router.get("/{expense_id}", response_model=ExpenseRead)
def get_expense(
    expense_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> ExpenseRead:
    return expense_service.get_expense(db, user_id, expense_id)


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> ExpenseRead:
    return expense_service.create_expense(db, user_id, data)


@router.put("/{expense_id}", response_model=ExpenseRead)
def update_expense(
    expense_id: uuid.UUID,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> ExpenseRead:
    return expense_service.update_expense(db, user_id, expense_id, data)


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, bool]:
    expense_service.delete_expense(db, user_id, expense_id)
    return {"success": True}
