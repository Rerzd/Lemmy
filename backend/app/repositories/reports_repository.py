from datetime import date
from typing import Optional
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.transaction import Transaction

# Same conventions as summary_repository: half-open [start, end) date ranges and
# conditional SUM(CASE ...) columns, so every total is computed by the database.


def _in_range(start: date, end: date):
    return and_(Transaction.date >= start, Transaction.date < end)


def expense_categories(db: Session, user_id: int) -> list[Category]:
    return (
        db.query(Category)
        .filter(Category.user_id == user_id, Category.type == "expense")
        .order_by(Category.id)
        .all()
    )


def first_transaction_date(db: Session, user_id: int) -> Optional[date]:
    return db.query(func.min(Transaction.date)).filter(Transaction.user_id == user_id).scalar()


def lifetime_totals(db: Session, user_id: int) -> tuple[float, float]:
    """(income, expense) over every transaction the user has."""
    is_income = Transaction.type == "income"
    row = (
        db.query(
            func.coalesce(func.sum(case((is_income, Transaction.amount), else_=0)), 0),
            func.coalesce(func.sum(case((is_income, 0), else_=Transaction.amount)), 0),
        )
        .filter(Transaction.user_id == user_id)
        .one()
    )
    return float(row[0]), float(row[1])


def expenses_per_category_per_month(
    db: Session, user_id: int, months: list[tuple[date, date]]
) -> dict[int, list[float]]:
    """{category_id: [expense total for each month]} in a single grouped query."""
    columns = [
        func.coalesce(func.sum(case((_in_range(start, end), Transaction.amount), else_=0)), 0)
        for start, end in months
    ]
    rows = (
        db.query(Transaction.category_id, *columns)
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            _in_range(months[0][0], months[-1][1]),
        )
        .group_by(Transaction.category_id)
        .all()
    )
    return {row[0]: [float(v or 0) for v in row[1:]] for row in rows}


def transactions_with_category(db: Session, user_id: int, start: date, end: date):
    """Rows of (Transaction, category name) for the CSV export, oldest first."""
    return (
        db.query(Transaction, Category.name)
        .join(Category, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == user_id, _in_range(start, end))
        .order_by(Transaction.date, Transaction.id)
        .all()
    )
