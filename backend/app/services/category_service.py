"""Category business logic — merged predefined+custom list, duplicate-name
rejection (BR-03). Budgets (BR-12) are explicitly out of scope — no stub
endpoint is added, since an absent endpoint is simpler than a 501 placeholder
(TR-CQ-03 proportionality)."""

from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.models.category import Category
from app.repositories import category_repo
from app.schemas.category import CategoryRead


def _to_read(category: Category) -> CategoryRead:
    return CategoryRead.model_validate(category)


def list_categories(db: Session, user_id: str) -> list[CategoryRead]:
    return [_to_read(c) for c in category_repo.list_for_user(db, user_id)]


def create_category(db: Session, user_id: str, name: str) -> CategoryRead:
    if category_repo.name_collides(db, user_id, name):
        raise ConflictError(f"A category named {name!r} already exists")
    category = category_repo.create(db, user_id, name)
    return _to_read(category)
