"""Investment business logic. Since BR-18, `type` must name an investment
category (predefined or the caller's own) — the by-string reference mirrors
how expenses reference expense categories (see IMPLEMENTATION-PLAN.md note
near IMPL-BE-07/11). Same 404-not-403 discipline as expense_service.py
(BR-13)."""

import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, UnprocessableEntityError
from app.models.category import INVESTMENT_TYPE
from app.models.investment import Investment
from app.repositories import category_repo, investment_repo
from app.schemas.common import Page
from app.schemas.investment import InvestmentCreate, InvestmentRead, InvestmentUpdate


def _to_read(investment: Investment) -> InvestmentRead:
    return InvestmentRead.model_validate(investment)


def list_investments(
    db: Session,
    user_id: str,
    *,
    type_: str | None,
    date_from: date | None,
    date_to: date | None,
    page: int,
    page_size: int,
) -> Page[InvestmentRead]:
    rows, total = investment_repo.list_investments(
        db,
        user_id,
        type_=type_,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    return Page[InvestmentRead](
        items=[_to_read(row) for row in rows], total=total, page=page, page_size=page_size
    )


def get_investment(db: Session, user_id: str, investment_id: uuid.UUID) -> InvestmentRead:
    investment = investment_repo.get_investment(db, user_id, investment_id)
    if investment is None:
        raise NotFoundError("Investment not found")
    return _to_read(investment)


def _require_valid_type(db: Session, user_id: str, type_: str) -> None:
    if not category_repo.is_valid_category_for_user(db, user_id, type_, INVESTMENT_TYPE):
        raise UnprocessableEntityError(f"Unknown investment category: {type_!r}")


def create_investment(db: Session, user_id: str, data: InvestmentCreate) -> InvestmentRead:
    _require_valid_type(db, user_id, data.type)
    investment = investment_repo.create_investment(db, user_id, data)
    return _to_read(investment)


def update_investment(
    db: Session, user_id: str, investment_id: uuid.UUID, data: InvestmentUpdate
) -> InvestmentRead:
    if data.type is not None:
        _require_valid_type(db, user_id, data.type)
    investment = investment_repo.update_investment(db, user_id, investment_id, data)
    if investment is None:
        raise NotFoundError("Investment not found")
    return _to_read(investment)


def delete_investment(db: Session, user_id: str, investment_id: uuid.UUID) -> None:
    deleted = investment_repo.delete_investment(db, user_id, investment_id)
    if not deleted:
        raise NotFoundError("Investment not found")
