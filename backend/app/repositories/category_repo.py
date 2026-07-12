"""Category DB access."""

import uuid

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.models.category import EXPENSE_TYPE, Category
from app.models.expense import Expense
from app.models.investment import Investment


def list_for_user(db: Session, user_id: str, type_: str | None = None) -> list[Category]:
    stmt = select(Category).where(or_(Category.user_id.is_(None), Category.user_id == user_id))
    if type_ is not None:
        stmt = stmt.where(Category.type == type_)
    stmt = stmt.order_by(Category.type.asc(), Category.is_predefined.desc(), Category.name.asc())
    return list(db.scalars(stmt).all())


def get_for_user(db: Session, user_id: str, category_id: uuid.UUID) -> Category | None:
    """The category if it is predefined or owned by user_id; None otherwise
    (a non-owned custom category is indistinguishable from a missing one,
    BR-13)."""
    stmt = select(Category).where(
        Category.id == category_id,
        or_(Category.user_id.is_(None), Category.user_id == user_id),
    )
    return db.scalar(stmt)


def name_collides(
    db: Session,
    user_id: str,
    name: str,
    type_: str,
    exclude_id: uuid.UUID | None = None,
) -> bool:
    """Case-insensitive collision check within one type, against both the
    user's own custom categories and the predefined set (BR-03/BR-18: a name
    must be unique among everything the user would see in that module)."""
    stmt = select(Category.id).where(
        or_(Category.user_id.is_(None), Category.user_id == user_id),
        Category.type == type_,
        func.lower(Category.name) == name.lower(),
    )
    if exclude_id is not None:
        stmt = stmt.where(Category.id != exclude_id)
    return db.scalar(stmt) is not None


def is_valid_category_for_user(
    db: Session, user_id: str, name: str, type_: str = EXPENSE_TYPE
) -> bool:
    """True if `name` exactly matches a predefined category of `type_` or one
    owned by user_id. Used to validate the `category` field on an expense and
    the `type` field on an investment at write time (BR-03/BR-18), since those
    records store the category as a plain string, not a FK."""
    stmt = select(Category.id).where(
        or_(Category.user_id.is_(None), Category.user_id == user_id),
        Category.type == type_,
        Category.name == name,
    )
    return db.scalar(stmt) is not None


def has_children(db: Session, category_id: uuid.UUID) -> bool:
    stmt = select(Category.id).where(Category.parent_id == category_id).limit(1)
    return db.scalar(stmt) is not None


def expense_counts_by_category(db: Session, user_id: str) -> dict[str, int]:
    """The caller's expense count per category name — one grouped query for
    the whole list (TR-PERF-03: no per-category N+1)."""
    stmt = (
        select(Expense.category, func.count())
        .where(Expense.user_id == user_id)
        .group_by(Expense.category)
    )
    return {name: count for name, count in db.execute(stmt).all()}


def investment_counts_by_type(db: Session, user_id: str) -> dict[str, int]:
    """The caller's investment count per type (investment-category name)."""
    stmt = (
        select(Investment.type, func.count())
        .where(Investment.user_id == user_id)
        .group_by(Investment.type)
    )
    return {name: count for name, count in db.execute(stmt).all()}


def create(
    db: Session,
    user_id: str,
    name: str,
    type_: str,
    parent_id: uuid.UUID | None,
) -> Category:
    category = Category(
        user_id=user_id, name=name, type=type_, parent_id=parent_id, is_predefined=False
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def save(db: Session, category: Category) -> Category:
    db.commit()
    db.refresh(category)
    return category


def delete(db: Session, category: Category) -> None:
    db.delete(category)
    db.commit()


def rename_expense_references(db: Session, user_id: str, old_name: str, new_name: str) -> None:
    """Renaming a custom category propagates to the caller's expense rows so
    the by-name reference never dangles (only the owner's rows can reference
    a custom category)."""
    db.execute(
        update(Expense)
        .where(Expense.user_id == user_id, Expense.category == old_name)
        .values(category=new_name)
    )


def rename_investment_references(db: Session, user_id: str, old_name: str, new_name: str) -> None:
    db.execute(
        update(Investment)
        .where(Investment.user_id == user_id, Investment.type == old_name)
        .values(type=new_name)
    )
