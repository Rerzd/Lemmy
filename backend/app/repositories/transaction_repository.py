from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from app.models.transaction import Transaction


def _escape_like(value: str) -> str:
    # Treat % and _ typed by the user as literal characters, not wildcards.
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def get_all_by_user(
    db: Session,
    user_id: int,
    category_id: Optional[int] = None,
    type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Transaction], int]:
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    if category_id is not None:
        query = query.filter(Transaction.category_id == category_id)
    if type is not None:
        query = query.filter(Transaction.type == type)
    if date_from is not None:
        query = query.filter(Transaction.date >= date_from)
    if date_to is not None:
        query = query.filter(Transaction.date <= date_to)
    if q:
        query = query.filter(Transaction.description.ilike(f"%{_escape_like(q)}%", escape="\\"))

    # Count before paginating so the client knows how many pages exist.
    total = query.count()
    # id as a tie-breaker keeps pages stable when several rows share a date.
    items = (
        query.order_by(Transaction.date.desc(), Transaction.id.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return items, total


def count_by_category(db: Session, category_id: int) -> int:
    return db.query(Transaction).filter(Transaction.category_id == category_id).count()


def get_by_id(db: Session, transaction_id: int, user_id: int) -> Transaction | None:
    return (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == user_id)
        .first()
    )


def create(
    db: Session,
    user_id: int,
    category_id: int,
    amount: float,
    currency: str,
    type: str,
    description: Optional[str],
    date: date,
) -> Transaction:
    transaction = Transaction(
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        currency=currency,
        type=type,
        description=description,
        date=date,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def update(
    db: Session,
    transaction: Transaction,
    category_id: int,
    amount: float,
    currency: str,
    type: str,
    description: Optional[str],
    date: date,
) -> Transaction:
    transaction.category_id = category_id
    transaction.amount = amount
    transaction.currency = currency
    transaction.type = type
    transaction.description = description
    transaction.date = date
    db.commit()
    db.refresh(transaction)
    return transaction


def delete(db: Session, transaction: Transaction) -> None:
    db.delete(transaction)
    db.commit()
