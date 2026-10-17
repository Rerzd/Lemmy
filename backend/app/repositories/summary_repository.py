from datetime import date
from typing import Optional
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction

# Every query here filters by half-open date ranges [start, end) instead of
# extract(month/year). That keeps the SQL portable between SQLite and Postgres
# and lets the (user_id, date) index do the work.


def _in_range(start: date, end: date):
    return and_(Transaction.date >= start, Transaction.date < end)


def totals_by_type(db: Session, user_id: int, start: date, end: date) -> dict[str, tuple[float, int]]:
    """{type: (sum of amounts, number of transactions)} for one period."""
    rows = (
        db.query(Transaction.type, func.sum(Transaction.amount), func.count(Transaction.id))
        .filter(Transaction.user_id == user_id, _in_range(start, end))
        .group_by(Transaction.type)
        .all()
    )
    return {type_: (float(total or 0), count) for type_, total, count in rows}


def totals_by_category(db: Session, user_id: int, start: date, end: date, type: str):
    """Rows of (category_id, name, color, icon, total, count), biggest total first."""
    total = func.sum(Transaction.amount).label("total")
    return (
        db.query(
            Category.id,
            Category.name,
            Category.color,
            Category.icon,
            total,
            func.count(Transaction.id),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == user_id, Transaction.type == type, _in_range(start, end))
        .group_by(Category.id, Category.name, Category.color, Category.icon)
        .order_by(total.desc())
        .all()
    )


def totals_per_month(db: Session, user_id: int, months: list[tuple[date, date]]) -> list[tuple[float, float]]:
    """(income, expense) for each [start, end) period, computed in a single query.

    Each month becomes a pair of conditional SUM(CASE ...) columns, which every
    SQL dialect supports, so we don't need date_trunc/strftime.
    """
    columns = []
    for start, end in months:
        for type_ in ("income", "expense"):
            in_bucket = and_(_in_range(start, end), Transaction.type == type_)
            columns.append(func.coalesce(func.sum(case((in_bucket, Transaction.amount), else_=0)), 0))

    overall_start, overall_end = months[0][0], months[-1][1]
    row = (
        db.query(*columns)
        .filter(Transaction.user_id == user_id, _in_range(overall_start, overall_end))
        .one()
    )
    values = [float(v or 0) for v in row]
    return [(values[i], values[i + 1]) for i in range(0, len(values), 2)]


def expenses_by_category(
    db: Session, user_id: int, start: date, end: date, category_ids: Optional[list[int]] = None
) -> dict[int, float]:
    query = db.query(Transaction.category_id, func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.type == "expense",
        _in_range(start, end),
    )
    if category_ids is not None:
        query = query.filter(Transaction.category_id.in_(category_ids))
    return {category_id: float(total or 0) for category_id, total in query.group_by(Transaction.category_id)}


def budgets_with_category(db: Session, user_id: int, month: int, year: int):
    """Rows of (Budget, Category) for one month."""
    return (
        db.query(Budget, Category)
        .join(Category, Budget.category_id == Category.id)
        .filter(Budget.user_id == user_id, Budget.month == month, Budget.year == year)
        .order_by(Category.name)
        .all()
    )
