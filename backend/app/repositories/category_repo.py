"""Category DB access."""

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.category import Category


def list_for_user(db: Session, user_id: str) -> list[Category]:
    stmt = (
        select(Category)
        .where(or_(Category.user_id.is_(None), Category.user_id == user_id))
        .order_by(Category.is_predefined.desc(), Category.name.asc())
    )
    return list(db.scalars(stmt).all())


def name_collides(db: Session, user_id: str, name: str) -> bool:
    """Case-insensitive collision check against both the user's own custom
    categories and the predefined set (BR-03: a new custom name must be
    unique among everything the user would see)."""
    stmt = select(Category.id).where(
        or_(Category.user_id.is_(None), Category.user_id == user_id),
        func.lower(Category.name) == name.lower(),
    )
    return db.scalar(stmt) is not None


def is_valid_category_for_user(db: Session, user_id: str, name: str) -> bool:
    """True if `name` exactly matches a predefined category or one owned by
    user_id. Used to validate the `category` field on an expense at write
    time (BR-03), since expenses store category as a plain string, not a FK."""
    stmt = select(Category.id).where(
        or_(Category.user_id.is_(None), Category.user_id == user_id),
        Category.name == name,
    )
    return db.scalar(stmt) is not None


def create(db: Session, user_id: str, name: str) -> Category:
    category = Category(user_id=user_id, name=name, is_predefined=False)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
