"""Dashboard HTTP endpoints (BR-07/08/09)."""

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.dashboard import BreakdownResponse, DashboardSummary, TrendResponse
from app.services import analytics_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    period: Literal["month", "year", "all"] = Query(default="month"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> DashboardSummary:
    return analytics_service.get_summary(db, user_id, period)


@router.get("/trends", response_model=TrendResponse)
def get_trends(
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> TrendResponse:
    return analytics_service.get_trends(db, user_id, months)


@router.get("/breakdown", response_model=BreakdownResponse)
def get_breakdown(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> BreakdownResponse:
    return analytics_service.get_breakdown(db, user_id, date_from, date_to)
