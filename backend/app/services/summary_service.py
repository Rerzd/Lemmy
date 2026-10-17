from datetime import date
from typing import Optional
from sqlalchemy.orm import Session

from app.repositories import summary_repository
from app.schemas.summary import (
    BudgetStatus,
    CategoryTotal,
    ChangePct,
    OverviewResponse,
    PeriodTotals,
    TrendPoint,
)
from app.utils.dates import month_range, shift_month

# Budget thresholds, as a percent of the budget used.
WARNING_THRESHOLD = 80
OVER_THRESHOLD = 100


def resolve_period(month: Optional[int], year: Optional[int]) -> tuple[int, int]:
    # Both default to the current month so the dashboard needs no parameters.
    today = date.today()
    return month or today.month, year or today.year


def _period_totals(db: Session, user_id: int, year: int, month: int) -> tuple[PeriodTotals, int]:
    start, end = month_range(year, month)
    by_type = summary_repository.totals_by_type(db, user_id, start, end)
    income, income_count = by_type.get("income", (0.0, 0))
    expense, expense_count = by_type.get("expense", (0.0, 0))
    totals = PeriodTotals(income=income, expense=expense, net=income - expense)
    return totals, income_count + expense_count


def _change_pct(current: float, previous: float) -> Optional[float]:
    if previous == 0:
        return None
    # abs() keeps the sign meaningful when the previous net was negative:
    # going from -100 to -50 is an improvement (+50 %), not a decline.
    return round((current - previous) / abs(previous) * 100, 2)


def overview(db: Session, user_id: int, month: int, year: int) -> OverviewResponse:
    current, count = _period_totals(db, user_id, year, month)
    prev_year, prev_month = shift_month(year, month, -1)
    previous, _ = _period_totals(db, user_id, prev_year, prev_month)

    return OverviewResponse(
        month=month,
        year=year,
        income=current.income,
        expense=current.expense,
        net=current.net,
        savings_rate=round(current.net / current.income, 4) if current.income else None,
        transaction_count=count,
        previous=previous,
        change_pct=ChangePct(
            income=_change_pct(current.income, previous.income),
            expense=_change_pct(current.expense, previous.expense),
            net=_change_pct(current.net, previous.net),
        ),
    )


def by_category(db: Session, user_id: int, month: int, year: int, type: str) -> list[CategoryTotal]:
    start, end = month_range(year, month)
    rows = summary_repository.totals_by_category(db, user_id, start, end, type)
    grand_total = sum(float(row[4]) for row in rows)
    return [
        CategoryTotal(
            category_id=category_id,
            name=name,
            color=color,
            icon=icon,
            total=float(total),
            share=round(float(total) / grand_total, 4) if grand_total else 0.0,
            count=count,
        )
        for category_id, name, color, icon, total, count in rows
    ]


def trend(db: Session, user_id: int, months: int) -> list[TrendPoint]:
    today = date.today()
    # Oldest first, ending at the current month. Every month gets a point, even
    # without activity, so charts don't silently skip gaps.
    periods = [shift_month(today.year, today.month, -offset) for offset in range(months - 1, -1, -1)]
    totals = summary_repository.totals_per_month(db, user_id, [month_range(y, m) for y, m in periods])
    return [
        TrendPoint(year=y, month=m, income=income, expense=expense, net=income - expense)
        for (y, m), (income, expense) in zip(periods, totals)
    ]


def _budget_status(pct_used: float) -> str:
    if pct_used < WARNING_THRESHOLD:
        return "ok"
    if pct_used <= OVER_THRESHOLD:
        return "warning"
    return "over"


def budgets_status(db: Session, user_id: int, month: int, year: int) -> list[BudgetStatus]:
    rows = summary_repository.budgets_with_category(db, user_id, month, year)
    start, end = month_range(year, month)
    spent_by_category = summary_repository.expenses_by_category(
        db, user_id, start, end, [budget.category_id for budget, _ in rows]
    )

    result = []
    for budget, category in rows:
        spent = spent_by_category.get(budget.category_id, 0.0)
        pct_used = round(spent / budget.amount * 100, 2)
        result.append(
            BudgetStatus(
                budget_id=budget.id,
                category_id=category.id,
                name=category.name,
                color=category.color,
                icon=category.icon,
                budgeted=budget.amount,
                spent=spent,
                remaining=budget.amount - spent,
                pct_used=pct_used,
                status=_budget_status(pct_used),
            )
        )
    return result
