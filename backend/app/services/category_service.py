from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.category import Category
from app.repositories import category_repository

VALID_TYPES = {"income", "expense"}


def _validate_type(type: str) -> None:
    if type not in VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Category type must be 'income' or 'expense', got '{type}'.",
        )


def _get_or_404(db: Session, category_id: int, user_id: int) -> Category:
    category = category_repository.get_by_id(db, category_id, user_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    return category


def list_categories(db: Session, user_id: int) -> list[Category]:
    return category_repository.get_all_by_user(db, user_id)


def create_category(db: Session, user_id: int, name: str, type: str, color: str, icon: str) -> Category:
    _validate_type(type)
    return category_repository.create(db, user_id=user_id, name=name, type=type, color=color, icon=icon)


def update_category(
    db: Session, user_id: int, category_id: int, name: str, type: str, color: str, icon: str
) -> Category:
    _validate_type(type)
    category = _get_or_404(db, category_id, user_id)
    return category_repository.update(db, category, name=name, type=type, color=color, icon=icon)


def delete_category(db: Session, user_id: int, category_id: int) -> None:
    category = _get_or_404(db, category_id, user_id)
    category_repository.delete(db, category)
