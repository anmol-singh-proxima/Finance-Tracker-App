"""Category business logic (BR-03, BR-18): merged predefined+custom listing
with per-user linked-record counts, full CRUD for custom categories with
single-level hierarchy validation, and safe deletion (in-use or parent
categories cannot be deleted). Predefined categories are immutable.

Budgets (BR-12) remain explicitly out of scope — no stub endpoint is added,
since an absent endpoint is simpler than a 501 placeholder (TR-CQ-03
proportionality)."""

import uuid

from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, UnprocessableEntityError
from app.models.category import EXPENSE_TYPE, Category
from app.repositories import category_repo
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate


def _to_read(category: Category, linked_count: int) -> CategoryRead:
    read = CategoryRead.model_validate(category)
    read.linked_count = linked_count
    return read


def _linked_count(db: Session, user_id: str, category: Category) -> int:
    counts = (
        category_repo.expense_counts_by_category(db, user_id)
        if category.type == EXPENSE_TYPE
        else category_repo.investment_counts_by_type(db, user_id)
    )
    return counts.get(category.name, 0)


def _validate_parent(
    db: Session, user_id: str, type_: str, parent_id: uuid.UUID, child: Category | None = None
) -> None:
    if child is not None and parent_id == child.id:
        raise UnprocessableEntityError("A category cannot be its own parent")
    parent = category_repo.get_for_user(db, user_id, parent_id)
    if parent is None:
        raise UnprocessableEntityError("Parent category not found")
    if parent.type != type_:
        raise UnprocessableEntityError("Parent category must have the same type")
    if parent.parent_id is not None:
        raise UnprocessableEntityError(
            "Categories support a single level of nesting: a subcategory cannot be a parent"
        )
    if child is not None and category_repo.has_children(db, child.id):
        raise UnprocessableEntityError(
            "This category has subcategories, so it cannot become a subcategory itself"
        )


def list_categories(db: Session, user_id: str, type_: str | None = None) -> list[CategoryRead]:
    categories = category_repo.list_for_user(db, user_id, type_)
    expense_counts = category_repo.expense_counts_by_category(db, user_id)
    investment_counts = category_repo.investment_counts_by_type(db, user_id)
    return [
        _to_read(
            c,
            (expense_counts if c.type == EXPENSE_TYPE else investment_counts).get(c.name, 0),
        )
        for c in categories
    ]


def get_category(db: Session, user_id: str, category_id: uuid.UUID) -> CategoryRead:
    category = category_repo.get_for_user(db, user_id, category_id)
    if category is None:
        raise NotFoundError("Category not found")
    return _to_read(category, _linked_count(db, user_id, category))


def create_category(db: Session, user_id: str, data: CategoryCreate) -> CategoryRead:
    if data.parent_id is not None:
        _validate_parent(db, user_id, data.type, data.parent_id)
    if category_repo.name_collides(db, user_id, data.name, data.type):
        raise ConflictError(f"A {data.type} category named {data.name!r} already exists")
    category = category_repo.create(db, user_id, data.name, data.type, data.parent_id)
    return _to_read(category, 0)


def update_category(
    db: Session, user_id: str, category_id: uuid.UUID, data: CategoryUpdate
) -> CategoryRead:
    category = category_repo.get_for_user(db, user_id, category_id)
    if category is None:
        raise NotFoundError("Category not found")
    if category.is_predefined:
        raise ConflictError("Predefined categories cannot be modified")

    if "parent_id" in data.model_fields_set:
        if data.parent_id is not None:
            _validate_parent(db, user_id, category.type, data.parent_id, child=category)
        category.parent_id = data.parent_id

    if data.name is not None and data.name != category.name:
        if category_repo.name_collides(
            db, user_id, data.name, category.type, exclude_id=category.id
        ):
            raise ConflictError(f"A {category.type} category named {data.name!r} already exists")
        old_name = category.name
        category.name = data.name
        # Expenses/investments reference the category by name (see the data
        # model note in IMPLEMENTATION-PLAN.md), so a rename must propagate to
        # the caller's records in the same transaction.
        if category.type == EXPENSE_TYPE:
            category_repo.rename_expense_references(db, user_id, old_name, data.name)
        else:
            category_repo.rename_investment_references(db, user_id, old_name, data.name)

    category = category_repo.save(db, category)
    return _to_read(category, _linked_count(db, user_id, category))


def delete_category(db: Session, user_id: str, category_id: uuid.UUID) -> None:
    category = category_repo.get_for_user(db, user_id, category_id)
    if category is None:
        raise NotFoundError("Category not found")
    if category.is_predefined:
        raise ConflictError("Predefined categories cannot be deleted")
    if category_repo.has_children(db, category.id):
        raise ConflictError(
            "This category cannot be deleted because it has subcategories. "
            "Delete or re-parent the subcategories first."
        )
    linked = _linked_count(db, user_id, category)
    if linked > 0:
        noun = "expense" if category.type == EXPENSE_TYPE else "investment"
        raise ConflictError(
            f"This category cannot be deleted because it is currently used by "
            f"{linked} existing {noun} record{'s' if linked != 1 else ''}."
        )
    category_repo.delete(db, category)
