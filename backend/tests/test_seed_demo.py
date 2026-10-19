from datetime import date

from app.scripts.seed_demo import DEMO_EMAIL, DEMO_PASSWORD, seed
from tests.helpers import API


def test_seed_is_idempotent_and_shows_every_budget_status(client, db):
    today = date(2026, 10, 16)
    seed(db, today=today)
    seed(db, today=today)  # running it twice resets instead of duplicating

    token = client.post(f"{API}/auth/login", data={"username": DEMO_EMAIL, "password": DEMO_PASSWORD}).json()
    headers = {"Authorization": f"Bearer {token['access_token']}"}

    statuses = {
        row["name"]: row["status"]
        for row in client.get(f"{API}/budgets/status?month=10&year=2026", headers=headers).json()
    }
    assert statuses["Food & dining"] == "warning"
    assert statuses["Transport"] == "over"
    assert "ok" in statuses.values()

    response = client.get(f"{API}/transactions?limit=1", headers=headers)
    assert int(response.headers["X-Total-Count"]) > 100
    assert client.get(f"{API}/transactions?date_from=2026-10-17", headers=headers).headers["X-Total-Count"] == "0"
