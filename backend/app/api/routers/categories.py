"""Category HTTP endpoints (BR-03, BR-18): list (optionally by type), read,
create, update, delete. Deletion is refused with a 409 while the category is
referenced by any of the caller's records or has subcategories; predefined
categories are immutable. Expenses/investments reference categories by string
value, not FK — see IMPLEMENTATION-PLAN.md's note near IMPL-BE-11."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.category import CategoryCreate, CategoryRead, CategoryType, CategoryUpdate
from app.services import category_service

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(
    type: CategoryType | None = Query(default=None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> list[CategoryRead]:
    return category_service.list_categories(db, user_id, type)


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> CategoryRead:
    return category_service.create_category(db, user_id, data)


@router.get("/{category_id}", response_model=CategoryRead)
def get_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> CategoryRead:
    return category_service.get_category(db, user_id, category_id)


@router.put("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: uuid.UUID,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> CategoryRead:
    return category_service.update_category(db, user_id, category_id, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> None:
    category_service.delete_category(db, user_id, category_id)
