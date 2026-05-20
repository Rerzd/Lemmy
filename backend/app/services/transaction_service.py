from datetime import date
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.repositories import category_repository, transaction_repository


def _get_or_404(db: Session, transaction_id: int, user_id: int) -> Transaction:
    transaction = transaction_repository.get_by_id(db, transaction_id, user_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")
    return transaction


def _validate_category_ownership(db: Session, category_id: int, user_id: int) -> None:
    # Prevents a user from logging a transaction under someone else's category.
    category = category_repository.get_by_id(db, category_id, user_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or does not belong to you.",
        )


def list_transactions(
    db: Session,
    user_id: int,
    category_id: Optional[int] = None,
    type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[Transaction]:
    return transaction_repository.get_all_by_user(
        db, user_id, category_id=category_id, type=type, date_from=date_from, date_to=date_to
    )


def create_transaction(
    db: Session,
    user_id: int,
    category_id: int,
    amount: float,
    currency: str,
    type: str,
    description: Optional[str],
    date: date,
) -> Transaction:
    _validate_category_ownership(db, category_id, user_id)
    return transaction_repository.create(
        db,
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        currency=currency,
        type=type,
        description=description,
        date=date,
    )


def update_transaction(
    db: Session,
    user_id: int,
    transaction_id: int,
    category_id: int,
    amount: float,
    currency: str,
    type: str,
    description: Optional[str],
    date: date,
) -> Transaction:
    _validate_category_ownership(db, category_id, user_id)
    transaction = _get_or_404(db, transaction_id, user_id)
    return transaction_repository.update(
        db,
        transaction,
        category_id=category_id,
        amount=amount,
        currency=currency,
        type=type,
        description=description,
        date=date,
    )


def delete_transaction(db: Session, user_id: int, transaction_id: int) -> None:
    transaction = _get_or_404(db, transaction_id, user_id)
    transaction_repository.delete(db, transaction)
