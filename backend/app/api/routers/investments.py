"""Investment HTTP endpoints — same thin-router pattern as expenses.py."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.common import Page
from app.schemas.investment import InvestmentCreate, InvestmentRead, InvestmentUpdate
from app.services import investment_service

router = APIRouter(prefix="/api/investments", tags=["investments"])


@router.get("", response_model=Page[InvestmentRead])
def list_investments(
    type_: str | None = Query(default=None, alias="type"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> Page[InvestmentRead]:
    return investment_service.list_investments(
        db,
        user_id,
        type_=type_,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )


@router.get("/{investment_id}", response_model=InvestmentRead)
def get_investment(
    investment_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> InvestmentRead:
    return investment_service.get_investment(db, user_id, investment_id)


@router.post("", response_model=InvestmentRead, status_code=status.HTTP_201_CREATED)
def create_investment(
    data: InvestmentCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> InvestmentRead:
    return investment_service.create_investment(db, user_id, data)


@router.put("/{investment_id}", response_model=InvestmentRead)
def update_investment(
    investment_id: uuid.UUID,
    data: InvestmentUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> InvestmentRead:
    return investment_service.update_investment(db, user_id, investment_id, data)


@router.delete("/{investment_id}")
def delete_investment(
    investment_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, bool]:
    investment_service.delete_investment(db, user_id, investment_id)
    return {"success": True}
