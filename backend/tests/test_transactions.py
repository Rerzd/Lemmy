from tests.helpers import API, create_category, create_transaction


def test_pagination_returns_total_in_header(client, auth_headers):
    category = create_category(client, auth_headers)
    for day in range(1, 8):
        create_transaction(client, auth_headers, category["id"], date=f"2026-03-{day:02d}")

    response = client.get(f"{API}/transactions?limit=3&offset=0", headers=auth_headers)
    assert response.status_code == 200
    assert response.headers["X-Total-Count"] == "7"
    page = response.json()
    assert [t["date"] for t in page] == ["2026-03-07", "2026-03-06", "2026-03-05"]

    last_page = client.get(f"{API}/transactions?limit=3&offset=6", headers=auth_headers).json()
    assert [t["date"] for t in last_page] == ["2026-03-01"]


def test_limit_is_capped(client, auth_headers):
    assert client.get(f"{API}/transactions?limit=501", headers=auth_headers).status_code == 422


def test_search_is_case_insensitive(client, auth_headers):
    category = create_category(client, auth_headers)
    create_transaction(client, auth_headers, category["id"], description="Almuerzo en el centro")
    create_transaction(client, auth_headers, category["id"], description="Mercado")

    response = client.get(f"{API}/transactions?q=ALMUERZO", headers=auth_headers)
    assert response.headers["X-Total-Count"] == "1"
    assert response.json()[0]["description"] == "Almuerzo en el centro"


def test_month_filter(client, auth_headers):
    category = create_category(client, auth_headers)
    create_transaction(client, auth_headers, category["id"], date="2026-02-28")
    create_transaction(client, auth_headers, category["id"], date="2026-03-01")
    create_transaction(client, auth_headers, category["id"], date="2026-03-31")
    create_transaction(client, auth_headers, category["id"], date="2026-04-01")

    response = client.get(f"{API}/transactions?month=3&year=2026", headers=auth_headers)
    assert response.headers["X-Total-Count"] == "2"
    assert client.get(f"{API}/transactions?month=3", headers=auth_headers).status_code == 422


def test_cors_exposes_total_count_header(client):
    response = client.options(
        f"{API}/transactions",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert response.status_code == 200
    response = client.get(f"{API}/transactions", headers={"Origin": "http://localhost:5173"})
    assert "X-Total-Count" in response.headers.get("access-control-expose-headers", "")
