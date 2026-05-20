from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.repositories import budget_repository, category_repository


def _get_or_404(db: Session, budget_id: int, user_id: int) -> Budget:
    budget = budget_repository.get_by_id(db, budget_id, user_id)
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found.")
    return budget


def _validate_category_ownership(db: Session, category_id: int, user_id: int) -> None:
    category = category_repository.get_by_id(db, category_id, user_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or does not belong to you.",
        )


def _check_no_duplicate(
    db: Session, user_id: int, category_id: int, month: int, year: int
) -> None:
    # A budget for this (category, month, year) already exists — reject with 409 Conflict.
    existing = budget_repository.get_by_unique_key(db, user_id, category_id, month, year)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A budget for this category in {month}/{year} already exists.",
        )


def list_budgets(
    db: Session,
    user_id: int,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> list[Budget]:
    return budget_repository.get_all_by_user(db, user_id, month=month, year=year)


def create_budget(
    db: Session,
    user_id: int,
    category_id: int,
    amount: float,
    currency: str,
    month: int,
    year: int,
) -> Budget:
    _validate_category_ownership(db, category_id, user_id)
    _check_no_duplicate(db, user_id, category_id, month, year)
    return budget_repository.create(
        db,
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        currency=currency,
        month=month,
        year=year,
    )


def update_budget(
    db: Session, user_id: int, budget_id: int, amount: float, currency: str
) -> Budget:
    # No duplicate check needed — category/month/year aren't changing.
    budget = _get_or_404(db, budget_id, user_id)
    return budget_repository.update(db, budget, amount=amount, currency=currency)


def delete_budget(db: Session, user_id: int, budget_id: int) -> None:
    budget = _get_or_404(db, budget_id, user_id)
    budget_repository.delete(db, budget)
