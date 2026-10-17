from datetime import date

import pytest

from app.utils.dates import shift_month
from tests.helpers import API, create_budget, create_transaction


def _categories(client, headers) -> dict[str, int]:
    return {c["name"]: c["id"] for c in client.get(f"{API}/categories", headers=headers).json()}


@pytest.fixture()
def march_data(client, auth_headers):
    """Hand-computed fixture.

    Feb 2026: income 1,000,000 · expense 400,000 · net 600,000
    Mar 2026: income 1,200,000 · expense 900,000 · net 300,000 (6 transactions)
              Housing 450,000 · Food 300,000 (2 tx) · Transport 150,000
    Apr 2026: no activity
    """
    c = _categories(client, auth_headers)
    tx = lambda cat, amount, type, day: create_transaction(  # noqa: E731
        client, auth_headers, c[cat], amount=amount, type=type, date=day
    )
    tx("Salary", 1_000_000, "income", "2026-02-01")
    tx("Food & dining", 400_000, "expense", "2026-02-15")

    tx("Salary", 1_000_000, "income", "2026-03-01")
    tx("Freelance", 200_000, "income", "2026-03-20")
    tx("Food & dining", 100_000, "expense", "2026-03-05")
    tx("Food & dining", 200_000, "expense", "2026-03-31")
    tx("Transport", 150_000, "expense", "2026-03-10")
    tx("Housing", 450_000, "expense", "2026-03-02")
    return c


def test_overview(client, auth_headers, march_data):
    body = client.get(f"{API}/summary/overview?month=3&year=2026", headers=auth_headers).json()
    assert body["income"] == 1_200_000
    assert body["expense"] == 900_000
    assert body["net"] == 300_000
    assert body["savings_rate"] == 0.25
    assert body["transaction_count"] == 6
    assert body["previous"] == {"income": 1_000_000, "expense": 400_000, "net": 600_000}
    assert body["change_pct"] == {"income": 20.0, "expense": 125.0, "net": -50.0}


def test_overview_month_without_activity(client, auth_headers, march_data):
    april = client.get(f"{API}/summary/overview?month=4&year=2026", headers=auth_headers).json()
    assert april["income"] == 0 and april["transaction_count"] == 0
    assert april["savings_rate"] is None
    assert april["change_pct"]["income"] == -100.0

    # The previous month (April) is all zeros, so every change is undefined.
    may = client.get(f"{API}/summary/overview?month=5&year=2026", headers=auth_headers).json()
    assert may["change_pct"] == {"income": None, "expense": None, "net": None}


def test_by_category(client, auth_headers, march_data):
    rows = client.get(f"{API}/summary/by-category?month=3&year=2026", headers=auth_headers).json()
    assert [(r["name"], r["total"], r["share"], r["count"]) for r in rows] == [
        ("Housing", 450_000, 0.5, 1),
        ("Food & dining", 300_000, 0.3333, 2),
        ("Transport", 150_000, 0.1667, 1),
    ]
    assert rows[0]["icon"] == "home" and rows[0]["color"].startswith("#")

    income = client.get(f"{API}/summary/by-category?month=3&year=2026&type=income", headers=auth_headers).json()
    assert [(r["name"], r["share"]) for r in income] == [("Salary", 0.8333), ("Freelance", 0.1667)]


def test_trend_includes_months_without_activity(client, auth_headers):
    c = _categories(client, auth_headers)
    today = date.today()
    two_ago = shift_month(today.year, today.month, -2)
    create_transaction(client, auth_headers, c["Salary"], amount=500, type="income", date=today.isoformat())
    create_transaction(
        client, auth_headers, c["Transport"], amount=200, date=date(two_ago[0], two_ago[1], 1).isoformat()
    )
    # Outside the 6-month window: must not leak into the oldest bucket.
    seven_ago = shift_month(today.year, today.month, -7)
    create_transaction(client, auth_headers, c["Transport"], amount=999, date=date(*seven_ago, 1).isoformat())

    points = client.get(f"{API}/summary/trend?months=6", headers=auth_headers).json()
    assert len(points) == 6
    assert [(p["year"], p["month"]) for p in points] == [
        shift_month(today.year, today.month, -offset) for offset in range(5, -1, -1)
    ]
    assert points[-1] == {"year": today.year, "month": today.month, "income": 500, "expense": 0, "net": 500}
    assert points[-3]["expense"] == 200 and points[-3]["net"] == -200
    assert sum(p["income"] + p["expense"] for p in points) == 700


def test_trend_months_is_capped(client, auth_headers):
    assert client.get(f"{API}/summary/trend?months=25", headers=auth_headers).status_code == 422


def test_budget_status(client, auth_headers, march_data):
    c = march_data
    create_budget(client, auth_headers, c["Food & dining"], amount=500_000)  # 300k / 500k = 60 %
    create_budget(client, auth_headers, c["Transport"], amount=187_500)  # 150k / 187.5k = 80 %
    create_budget(client, auth_headers, c["Utilities"], amount=100_000)  # nothing spent
    create_budget(client, auth_headers, c["Housing"], amount=400_000)  # 450k / 400k = 112.5 %
    # Same category, other month: must not show up.
    create_budget(client, auth_headers, c["Health"], amount=1_000, month=4)

    rows = client.get(f"{API}/budgets/status?month=3&year=2026", headers=auth_headers).json()
    by_name = {r["name"]: r for r in rows}
    assert set(by_name) == {"Food & dining", "Transport", "Utilities", "Housing"}

    assert (by_name["Food & dining"]["pct_used"], by_name["Food & dining"]["status"]) == (60.0, "ok")
    assert (by_name["Transport"]["pct_used"], by_name["Transport"]["status"]) == (80.0, "warning")
    assert (by_name["Utilities"]["spent"], by_name["Utilities"]["status"]) == (0, "ok")
    assert by_name["Housing"]["status"] == "over"
    assert by_name["Housing"]["remaining"] == -50_000
    assert by_name["Housing"]["pct_used"] == 112.5


def test_summary_requires_auth(client):
    assert client.get(f"{API}/summary/overview").status_code == 401
