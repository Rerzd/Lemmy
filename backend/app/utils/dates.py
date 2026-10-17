from datetime import date


def month_range(year: int, month: int) -> tuple[date, date]:
    """Returns [first day of the month, first day of the next month).

    Filtering by a half-open date range instead of extract(month/year) keeps
    queries portable across SQLite and Postgres and lets them use the
    (user_id, date) index.
    """
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


def shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    """Moves (year, month) by `delta` months, e.g. (2026, 1, -1) -> (2025, 12)."""
    index = year * 12 + (month - 1) + delta
    return index // 12, index % 12 + 1
