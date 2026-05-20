from typing import Optional
from sqlalchemy.orm import Session
from app.models.budget import Budget


def get_all_by_user(
    db: Session,
    user_id: int,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> list[Budget]:
    query = db.query(Budget).filter(Budget.user_id == user_id)
    if month is not None:
        query = query.filter(Budget.month == month)
    if year is not None:
        query = query.filter(Budget.year == year)
    return query.all()


def get_by_id(db: Session, budget_id: int, user_id: int) -> Budget | None:
    return (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == user_id)
        .first()
    )


# Looks up a budget by its natural key — used to detect duplicates before creating.
def get_by_unique_key(
    db: Session, user_id: int, category_id: int, month: int, year: int
) -> Budget | None:
    return (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.category_id == category_id,
            Budget.month == month,
            Budget.year == year,
        )
        .first()
    )


def create(
    db: Session,
    user_id: int,
    category_id: int,
    amount: float,
    currency: str,
    month: int,
    year: int,
) -> Budget:
    budget = Budget(
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        currency=currency,
        month=month,
        year=year,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def update(db: Session, budget: Budget, amount: float, currency: str) -> Budget:
    budget.amount = amount
    budget.currency = currency
    db.commit()
    db.refresh(budget)
    return budget


def delete(db: Session, budget: Budget) -> None:
    db.delete(budget)
    db.commit()
