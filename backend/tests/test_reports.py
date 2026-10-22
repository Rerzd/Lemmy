import csv
import io
from datetime import date

import pytest

from app.services import reports_service
from app.utils.dates import shift_month
from tests.helpers import API, create_category, create_transaction


def _categories(client, headers) -> dict[str, dict]:
    return {c["name"]: c for c in client.get(f"{API}/categories", headers=headers).json()}


def _living(client, headers, month="2026-05"):
    response = client.get(f"{API}/reports/living-costs?month={month}", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture()
def history(client, auth_headers):
    """Hand-computed fixture for May 2026 (Housing and Utilities are fixed by default).

    Jan: Salary 12,000,000 · Food 99,999           (history starts here, outside the window)
    Feb: Housing 1,000,000 · Food 300,000
    Mar: Housing 1,000,000 · Utilities 200,000 · Food 600,000
    Apr: Housing 1,000,000 · Utilities 100,000      (no Food at all)
    May: Housing 1,000,000 · Utilities 150,000 · Food 450,000

    Baseline = Feb..Apr / 3: Housing 1,000,000 · Utilities 100,000 · Food 300,000
      fixed 1,100,000 · variable 300,000 · total 1,400,000
    Savings = 12,000,000 - 5,899,999 = 6,100,001 -> cushion 4.36 months
    """
    c = _categories(client, auth_headers)
    tx = lambda cat, amount, day, type="expense": create_transaction(  # noqa: E731
        client, auth_headers, c[cat]["id"], amount=amount, type=type, date=day
    )
    tx("Salary", 12_000_000, "2026-01-05", "income")
    tx("Food & dining", 99_999, "2026-01-20")
    for month in ("02", "03", "04", "05"):
        tx("Housing", 1_000_000, f"2026-{month}-01")
    tx("Utilities", 200_000, "2026-03-12")
    tx("Utilities", 100_000, "2026-04-12")
    tx("Utilities", 150_000, "2026-05-12")
    tx("Food & dining", 300_000, "2026-02-10")
    tx("Food & dining", 600_000, "2026-03-31")
    tx("Food & dining", 450_000, "2026-05-31")
    return c


def test_reports_require_auth(client):
    for path in ("living-costs", "category-spending", "export.csv"):
        assert client.get(f"{API}/reports/{path}").status_code == 401


@pytest.mark.parametrize("month", ["2026-13", "2026-1", "202605", "may"])
def test_month_must_be_yyyy_mm(client, auth_headers, month):
    assert client.get(f"{API}/reports/living-costs?month={month}", headers=auth_headers).status_code == 422


def test_living_costs_splits_fixed_and_variable(client, auth_headers, history):
    body = _living(client, auth_headers)
    assert body["month"] == "2026-05"
    assert body["months_used"] == 3
    assert body["baseline_months"] == ["2026-02", "2026-03", "2026-04"]
    assert body["this_month"] == {"fixed": 1_150_000, "variable": 450_000, "total": 1_600_000, "fixed_share": 0.7188}
    assert body["baseline"] == {"fixed": 1_100_000, "variable": 300_000, "total": 1_400_000, "fixed_share": 0.7857}
    assert body["min_monthly_income"] == 1_400_000
    assert body["savings"] == 6_100_001
    assert body["cushion_months"] == 4.36

    rows = {r["name"]: r for r in body["categories"]}
    assert rows["Housing"]["is_fixed"] is True and rows["Food & dining"]["is_fixed"] is False
    assert rows["Food & dining"] == {**rows["Food & dining"], "this_month": 450_000, "baseline": 300_000, "change_pct": 50.0}
    # Biggest baseline first.
    assert [r["name"] for r in body["categories"][:3]] == ["Housing", "Food & dining", "Utilities"]


def test_category_without_spending_is_listed_with_zeros(client, auth_headers, history):
    rows = {r["name"]: r for r in _living(client, auth_headers)["categories"]}
    assert rows["Health"]["this_month"] == 0
    assert rows["Health"]["baseline"] == 0
    assert rows["Health"]["change_pct"] is None
    # Only expense categories belong in living costs.
    assert "Salary" not in rows


def test_no_history_returns_nulls_not_zeros(client, auth_headers):
    body = _living(client, auth_headers)
    assert body["months_used"] == 0
    assert body["baseline_months"] == []
    assert body["baseline"] is None
    assert body["min_monthly_income"] is None
    assert body["cushion_months"] is None
    assert body["savings"] == 0
    assert body["this_month"]["total"] == 0 and body["this_month"]["fixed_share"] is None
    assert all(r["baseline"] is None and r["change_pct"] is None for r in body["categories"])


def test_fewer_than_three_months_uses_what_exists(client, auth_headers):
    c = _categories(client, auth_headers)
    create_transaction(client, auth_headers, c["Housing"]["id"], amount=900_000, date="2026-03-01")
    create_transaction(client, auth_headers, c["Food & dining"]["id"], amount=300_000, date="2026-04-02")
    body = _living(client, auth_headers)
    assert body["months_used"] == 2
    assert body["baseline_months"] == ["2026-03", "2026-04"]
    # Averaged over the 2 months that exist, not 3.
    assert body["baseline"] == {"fixed": 450_000, "variable": 150_000, "total": 600_000, "fixed_share": 0.75}


def test_current_month_is_never_part_of_the_baseline(client, db, auth_headers):
    c = _categories(client, auth_headers)
    create_transaction(client, auth_headers, c["Housing"]["id"], amount=500_000, date="2026-04-01")
    create_transaction(client, auth_headers, c["Housing"]["id"], amount=700_000, date="2026-05-01")
    user_id = client.get(f"{API}/auth/me", headers=auth_headers).json()["id"]
    # Asking for June while it's still mid-May: May is incomplete, so only April counts.
    body = reports_service.living_costs(db, user_id, 2026, 6, today=date(2026, 5, 15))
    assert body.months_used == 1
    assert body.baseline_months == ["2026-04"]
    assert body.baseline.total == 500_000


def test_cushion_edge_cases(client, auth_headers):
    c = _categories(client, auth_headers)
    # History with income only: the baseline exists but is 0, so the cushion is undefined.
    create_transaction(client, auth_headers, c["Salary"]["id"], amount=1_000_000, type="income", date="2026-04-01")
    body = _living(client, auth_headers)
    assert body["months_used"] == 1
    assert body["baseline"]["total"] == 0
    assert body["min_monthly_income"] == 0
    assert body["savings"] == 1_000_000
    assert body["cushion_months"] is None

    # Spending more than ever earned floors savings at 0: a cushion of 0 months, not negative.
    create_transaction(client, auth_headers, c["Housing"]["id"], amount=3_000_000, date="2026-04-02")
    body = _living(client, auth_headers)
    assert body["savings"] == 0
    assert body["cushion_months"] == 0


def test_category_spending_zero_fills_months(client, auth_headers, history):
    response = client.get(f"{API}/reports/category-spending?from=2026-02&to=2026-05", headers=auth_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["months"] == ["2026-02", "2026-03", "2026-04", "2026-05"]
    rows = {r["name"]: r for r in body["categories"]}
    assert rows["Food & dining"]["totals"] == [300_000, 600_000, 0, 450_000]
    assert rows["Food & dining"]["total"] == 1_350_000
    assert rows["Health"]["totals"] == [0, 0, 0, 0]
    assert body["totals"] == [1_300_000, 1_800_000, 1_100_000, 1_600_000]
    assert body["categories"][0]["name"] == "Housing"


def test_category_spending_validates_range(client, auth_headers):
    url = f"{API}/reports/category-spending"
    assert client.get(f"{url}?from=2026-05&to=2026-02", headers=auth_headers).status_code == 422
    assert client.get(f"{url}?from=2024-01&to=2026-01", headers=auth_headers).status_code == 422
    assert client.get(f"{url}?from=2024-02&to=2026-01", headers=auth_headers).status_code == 200
    # Defaults: the 6 months ending this month.
    months = client.get(url, headers=auth_headers).json()["months"]
    today = date.today()
    assert months[-1] == f"{today.year:04d}-{today.month:02d}"
    assert months[0] == "{:04d}-{:02d}".format(*shift_month(today.year, today.month, -5))


def _export(client, headers, month="2026-05"):
    response = client.get(f"{API}/reports/export.csv?month={month}", headers=headers)
    assert response.status_code == 200, response.text
    return response


def test_export_csv_format(client, auth_headers, history):
    response = _export(client, auth_headers)
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"] == 'attachment; filename="lemmy-transactions-2026-05.csv"'
    text = response.content.decode("utf-8")
    assert text.startswith("﻿")  # BOM so Excel reads UTF-8
    rows = list(csv.reader(io.StringIO(text.lstrip("﻿"))))
    assert rows[0] == ["date", "description", "category", "type", "amount"]
    # Only May, oldest first.
    assert [r[0] for r in rows[1:]] == ["2026-05-01", "2026-05-12", "2026-05-31"]
    assert rows[1][2:] == ["Housing", "expense", "1000000.00"]


def test_export_csv_escapes_commas_quotes_and_newlines(client, auth_headers):
    c = _categories(client, auth_headers)
    tricky = 'Lunch, "special"\nwith friends'
    create_transaction(client, auth_headers, c["Food & dining"]["id"], date="2026-05-03", description=tricky)
    text = _export(client, auth_headers).content.decode("utf-8").lstrip("﻿")
    assert '"Lunch, ""special""\nwith friends"' in text
    rows = list(csv.reader(io.StringIO(text)))
    assert len(rows) == 2 and rows[1][1] == tricky


@pytest.mark.parametrize("value", ["=SUM(A1:A9)", "+57 300 123", "-2+3", "@cmd", "\tindent"])
def test_export_csv_blocks_formula_injection(client, auth_headers, value):
    category = create_category(client, auth_headers, name=value.strip()[:50] or "x")
    create_transaction(client, auth_headers, category["id"], date="2026-05-03", description=value)
    rows = list(csv.reader(io.StringIO(_export(client, auth_headers).content.decode("utf-8").lstrip("﻿"))))
    assert rows[1][1] == "'" + value
    if category["name"][0] in "=+-@":
        assert rows[1][2] == "'" + category["name"]
    # Plain values and numbers are left alone.
    assert rows[1][4] == "10000.00"


def test_export_csv_only_has_the_users_rows(client, auth_headers, history):
    from tests.conftest import register_and_login

    other = register_and_login(client, email="bob@example.com")
    rows = list(csv.reader(io.StringIO(_export(client, other).content.decode("utf-8").lstrip("﻿"))))
    assert rows == [["date", "description", "category", "type", "amount"]]
