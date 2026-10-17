from datetime import date, timedelta
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.transaction import Transaction
from app.repositories import category_repository, transaction_repository
from app.services.currency import resolve_currency
from app.utils.dates import month_range


def _get_or_404(db: Session, transaction_id: int, user_id: int) -> Transaction:
    transaction = transaction_repository.get_by_id(db, transaction_id, user_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")
    return transaction


def _get_owned_category(db: Session, category_id: int, user_id: int) -> Category:
    # Prevents a user from logging a transaction under someone else's category.
    category = category_repository.get_by_id(db, category_id, user_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or does not belong to you.",
        )
    return category


def _validate_type_matches_category(type: str, category: Category) -> None:
    # An "expense" logged under "Salary" would corrupt every per-category total,
    # so the transaction type must agree with its category's type.
    if type != category.type:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Transaction type '{type}' does not match category '{category.name}' ({category.type}).",
        )


def list_transactions(
    db: Session,
    user_id: int,
    category_id: Optional[int] = None,
    type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Transaction], int]:
    if month is not None and year is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Filtering by month also requires a year.",
        )
    if year is not None:
        # month/year narrow whatever explicit date range was given.
        start, end = month_range(year, month) if month else (date(year, 1, 1), date(year + 1, 1, 1))
        last_day = end - timedelta(days=1)
        date_from = max(date_from, start) if date_from else start
        date_to = min(date_to, last_day) if date_to else last_day

    return transaction_repository.get_all_by_user(
        db,
        user_id,
        category_id=category_id,
        type=type,
        date_from=date_from,
        date_to=date_to,
        q=q.strip() if q else None,
        limit=limit,
        offset=offset,
    )


def create_transaction(
    db: Session,
    user_id: int,
    user_currency: str,
    category_id: int,
    amount: float,
    currency: Optional[str],
    type: str,
    description: Optional[str],
    date: date,
) -> Transaction:
    category = _get_owned_category(db, category_id, user_id)
    _validate_type_matches_category(type, category)
    return transaction_repository.create(
        db,
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        currency=resolve_currency(currency, user_currency),
        type=type,
        description=description,
        date=date,
    )


def update_transaction(
    db: Session,
    user_id: int,
    user_currency: str,
    transaction_id: int,
    category_id: int,
    amount: float,
    currency: Optional[str],
    type: str,
    description: Optional[str],
    date: date,
) -> Transaction:
    transaction = _get_or_404(db, transaction_id, user_id)
    category = _get_owned_category(db, category_id, user_id)
    _validate_type_matches_category(type, category)
    return transaction_repository.update(
        db,
        transaction,
        category_id=category_id,
        amount=amount,
        currency=resolve_currency(currency, user_currency),
        type=type,
        description=description,
        date=date,
    )


def delete_transaction(db: Session, user_id: int, transaction_id: int) -> None:
    transaction = _get_or_404(db, transaction_id, user_id)
    transaction_repository.delete(db, transaction)
