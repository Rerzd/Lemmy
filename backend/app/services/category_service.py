from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.category import Category
from app.repositories import budget_repository, category_repository, transaction_repository

VALID_TYPES = {"income", "expense"}


def _validate_type(type: str) -> None:
    if type not in VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Category type must be 'income' or 'expense', got '{type}'.",
        )


def _validate_fixed(type: str, is_fixed: bool) -> None:
    # Income isn't a cost, so "fixed" only applies to expense categories.
    if is_fixed and type != "expense":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Only expense categories can be marked as a fixed monthly cost.",
        )


def _get_or_404(db: Session, category_id: int, user_id: int) -> Category:
    category = category_repository.get_by_id(db, category_id, user_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    return category


def list_categories(db: Session, user_id: int) -> list[Category]:
    return category_repository.get_all_by_user(db, user_id)


def create_category(
    db: Session, user_id: int, name: str, type: str, color: str, icon: str, is_fixed: bool = False
) -> Category:
    _validate_type(type)
    _validate_fixed(type, is_fixed)
    return category_repository.create(
        db, user_id=user_id, name=name, type=type, color=color, icon=icon, is_fixed=is_fixed
    )


def update_category(
    db: Session,
    user_id: int,
    category_id: int,
    name: str,
    type: str,
    color: str,
    icon: str,
    is_fixed: bool = False,
) -> Category:
    _validate_type(type)
    _validate_fixed(type, is_fixed)
    category = _get_or_404(db, category_id, user_id)
    # Flipping the type would leave existing transactions contradicting their category.
    if type != category.type and transaction_repository.count_by_category(db, category.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can't change the type of a category that already has transactions.",
        )
    return category_repository.update(
        db, category, name=name, type=type, color=color, icon=icon, is_fixed=is_fixed
    )


def _plural(count: int, word: str) -> str:
    return f"{count} {word}{'' if count == 1 else 's'}"


def delete_category(db: Session, user_id: int, category_id: int) -> None:
    category = _get_or_404(db, category_id, user_id)

    # No cascades on purpose: silently wiping someone's transaction history
    # because they removed a category is worse than asking them to reassign it.
    transactions = transaction_repository.count_by_category(db, category.id)
    budgets = budget_repository.count_by_category(db, category.id)
    if transactions or budgets:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Category has {_plural(transactions, 'transaction')} and {_plural(budgets, 'budget')}. "
                "Reassign or delete them first."
            ),
        )
    category_repository.delete(db, category)
