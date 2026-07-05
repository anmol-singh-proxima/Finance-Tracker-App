"""Investment business logic — no category linkage (investments use free-text
`type`, matching current app behavior — see IMPLEMENTATION-PLAN.md note near
IMPL-BE-07). Same 404-not-403 discipline as expense_service.py (BR-13)."""

import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.investment import Investment
from app.repositories import investment_repo
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


def create_investment(db: Session, user_id: str, data: InvestmentCreate) -> InvestmentRead:
    investment = investment_repo.create_investment(db, user_id, data)
    return _to_read(investment)


def update_investment(
    db: Session, user_id: str, investment_id: uuid.UUID, data: InvestmentUpdate
) -> InvestmentRead:
    investment = investment_repo.update_investment(db, user_id, investment_id, data)
    if investment is None:
        raise NotFoundError("Investment not found")
    return _to_read(investment)


def delete_investment(db: Session, user_id: str, investment_id: uuid.UUID) -> None:
    deleted = investment_repo.delete_investment(db, user_id, investment_id)
    if not deleted:
        raise NotFoundError("Investment not found")
