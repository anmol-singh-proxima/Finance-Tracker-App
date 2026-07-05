"""All investment DB access — same user_id-first filtering discipline as
expense_repo.py (TR-DAT-01)."""

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.investment import Investment
from app.schemas.investment import InvestmentCreate, InvestmentUpdate


def list_investments(
    db: Session,
    user_id: str,
    *,
    type_: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Investment], int]:
    stmt = select(Investment).where(Investment.user_id == user_id)
    if type_ is not None:
        stmt = stmt.where(Investment.type == type_)
    if date_from is not None:
        stmt = stmt.where(Investment.purchase_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Investment.purchase_date <= date_to)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    stmt = (
        stmt.order_by(Investment.purchase_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = list(db.scalars(stmt).all())
    return rows, total


def get_investment(db: Session, user_id: str, investment_id: uuid.UUID) -> Investment | None:
    stmt = select(Investment).where(Investment.user_id == user_id, Investment.id == investment_id)
    return db.scalar(stmt)


def create_investment(db: Session, user_id: str, data: InvestmentCreate) -> Investment:
    investment = Investment(
        user_id=user_id,
        name=data.name,
        type=data.type,
        amount=data.amount,
        current_value=data.current_value,
        purchase_date=data.purchase_date,
        notes=data.notes,
    )
    db.add(investment)
    db.commit()
    db.refresh(investment)
    return investment


def update_investment(
    db: Session, user_id: str, investment_id: uuid.UUID, data: InvestmentUpdate
) -> Investment | None:
    investment = get_investment(db, user_id, investment_id)
    if investment is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(investment, field, value)
    db.commit()
    db.refresh(investment)
    return investment


def delete_investment(db: Session, user_id: str, investment_id: uuid.UUID) -> bool:
    investment = get_investment(db, user_id, investment_id)
    if investment is None:
        return False
    db.delete(investment)
    db.commit()
    return True
