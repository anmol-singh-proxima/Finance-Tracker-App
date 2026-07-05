"""Category HTTP endpoints (BR-03). No PUT/DELETE in Phase 1 — predefined
categories are immutable and expenses reference categories by string value,
not FK, so this isn't blocking anything; see IMPLEMENTATION-PLAN.md's note
near IMPL-BE-11 for the full rationale."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.category import CategoryCreate, CategoryRead
from app.services import category_service

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(
    db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)
) -> list[CategoryRead]:
    return category_service.list_categories(db, user_id)


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> CategoryRead:
    return category_service.create_category(db, user_id, data.name)
