import csv
import io
from datetime import date
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories import reports_repository, summary_repository
from app.schemas.reports import (
    CategorySpendingResponse,
    CategorySpendingRow,
    CostSplit,
    LivingCostCategory,
    LivingCostsResponse,
)
from app.utils.dates import month_range, shift_month

BASELINE_MONTHS = 3
MAX_RANGE_MONTHS = 24
CSV_COLUMNS = ["date", "description", "category", "type", "amount"]
# Spreadsheets run cells that start with these as formulas (CSV injection).
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def parse_month(value: Optional[str], today: date) -> tuple[int, int]:
    """'2026-10' -> (2026, 10); None means the current month. The route already checked the format."""
    if value is None:
        return today.year, today.month
    year, month = value.split("-")
    return int(year), int(month)


def month_label(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def _index(year: int, month: int) -> int:
    return year * 12 + month - 1


def _split(rows: list[tuple[bool, float]]) -> CostSplit:
    fixed = sum(amount for is_fixed, amount in rows if is_fixed)
    variable = sum(amount for is_fixed, amount in rows if not is_fixed)
    total = fixed + variable
    return CostSplit(
        fixed=round(fixed, 2),
        variable=round(variable, 2),
        total=round(total, 2),
        fixed_share=round(fixed / total, 4) if total else None,
    )


def _baseline_months(db: Session, user_id: int, year: int, month: int, today: date) -> list[tuple[int, int]]:
    """The up-to-3 months before (year, month) that are complete and inside the user's history.

    A month is complete once it's before the current month. History starts at the
    user's first transaction, so a new account isn't averaged against empty months;
    after that, a month with no spending honestly counts as zero.
    """
    first = reports_repository.first_transaction_date(db, user_id)
    if first is None:
        return []
    current = _index(today.year, today.month)
    earliest = _index(first.year, first.month)
    window = [shift_month(year, month, -n) for n in range(BASELINE_MONTHS, 0, -1)]
    return [(y, m) for y, m in window if earliest <= _index(y, m) < current]


def living_costs(db: Session, user_id: int, year: int, month: int, today: date) -> LivingCostsResponse:
    categories = reports_repository.expense_categories(db, user_id)

    start, end = month_range(year, month)
    this_month = summary_repository.expenses_by_category(db, user_id, start, end)

    used = _baseline_months(db, user_id, year, month, today)
    baseline: Optional[dict[int, float]] = None
    if used:
        # The used months are consecutive, so one range query covers them all.
        first_start, _ = month_range(*used[0])
        _, last_end = month_range(*used[-1])
        sums = summary_repository.expenses_by_category(db, user_id, first_start, last_end)
        baseline = {category_id: total / len(used) for category_id, total in sums.items()}

    rows = []
    for c in categories:
        current = this_month.get(c.id, 0.0)
        average = None if baseline is None else round(baseline.get(c.id, 0.0), 2)
        rows.append(
            LivingCostCategory(
                category_id=c.id,
                name=c.name,
                color=c.color,
                icon=c.icon,
                is_fixed=c.is_fixed,
                this_month=round(current, 2),
                baseline=average,
                change_pct=round((current - average) / average * 100, 2) if average else None,
            )
        )
    rows.sort(key=lambda r: (r.baseline or 0, r.this_month), reverse=True)

    this_split = _split([(r.is_fixed, r.this_month) for r in rows])
    base_split = _split([(r.is_fixed, r.baseline or 0) for r in rows]) if baseline is not None else None

    income, expense = reports_repository.lifetime_totals(db, user_id)
    savings = max(0.0, income - expense)
    base_total = base_split.total if base_split else 0

    return LivingCostsResponse(
        month=month_label(year, month),
        months_used=len(used),
        baseline_months=[month_label(y, m) for y, m in used],
        this_month=this_split,
        baseline=base_split,
        min_monthly_income=base_split.total if base_split else None,
        savings=round(savings, 2),
        cushion_months=round(savings / base_total, 2) if base_total else None,
        categories=rows,
    )


def category_spending(
    db: Session, user_id: int, start_ym: tuple[int, int], end_ym: tuple[int, int]
) -> CategorySpendingResponse:
    count = _index(*end_ym) - _index(*start_ym) + 1
    if count < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="'from' must be the same month as 'to' or earlier.",
        )
    if count > MAX_RANGE_MONTHS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"The range can cover at most {MAX_RANGE_MONTHS} months.",
        )

    months = [shift_month(*start_ym, n) for n in range(count)]
    per_category = reports_repository.expenses_per_category_per_month(
        db, user_id, [month_range(y, m) for y, m in months]
    )
    rows = []
    for c in reports_repository.expense_categories(db, user_id):
        totals = [round(v, 2) for v in per_category.get(c.id, [0.0] * count)]
        rows.append(
            CategorySpendingRow(
                category_id=c.id,
                name=c.name,
                color=c.color,
                icon=c.icon,
                is_fixed=c.is_fixed,
                totals=totals,
                total=round(sum(totals), 2),
            )
        )
    rows.sort(key=lambda r: r.total, reverse=True)
    return CategorySpendingResponse(
        months=[month_label(y, m) for y, m in months],
        categories=rows,
        totals=[round(sum(r.totals[i] for r in rows), 2) for i in range(count)],
    )


def _safe_cell(value: str) -> str:
    # A leading quote makes spreadsheets show the text instead of evaluating it.
    return f"'{value}" if value.startswith(FORMULA_PREFIXES) else value


def export_csv(db: Session, user_id: int, year: int, month: int) -> str:
    start, end = month_range(year, month)
    buffer = io.StringIO()
    # The csv module quotes fields with commas, quotes or newlines (RFC 4180).
    writer = csv.writer(buffer)
    writer.writerow(CSV_COLUMNS)
    for tx, category in reports_repository.transactions_with_category(db, user_id, start, end):
        writer.writerow(
            [
                tx.date.isoformat(),
                _safe_cell(tx.description or ""),
                _safe_cell(category),
                tx.type,
                f"{tx.amount:.2f}",
            ]
        )
    # The BOM lets Excel detect UTF-8, so names like "Éxito" open correctly.
    return "﻿" + buffer.getvalue()
