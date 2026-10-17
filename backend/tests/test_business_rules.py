import pytest

from tests.conftest import register_and_login
from tests.helpers import API, create_budget, create_category, create_transaction


@pytest.fixture()
def other_headers(client, auth_headers):
    # A second user, registered after the first, to check data isolation.
    return register_and_login(client, email="bob@example.com", name="Bob")


def test_users_cannot_see_each_others_data(client, auth_headers, other_headers):
    category = create_category(client, auth_headers)
    transaction = create_transaction(client, auth_headers, category["id"])
    budget = create_budget(client, auth_headers, category["id"])

    assert client.get(f"{API}/categories/{category['id']}", headers=other_headers).status_code == 404
    assert client.get(f"{API}/transactions/{transaction['id']}", headers=other_headers).status_code == 404
    assert client.get(f"{API}/budgets/{budget['id']}", headers=other_headers).status_code == 404
    assert client.delete(f"{API}/transactions/{transaction['id']}", headers=other_headers).status_code == 404

    # Nor can they log a transaction under someone else's category.
    body = {"category_id": category["id"], "amount": 1, "type": "expense", "date": "2026-03-01"}
    assert client.post(f"{API}/transactions", json=body, headers=other_headers).status_code == 404


@pytest.mark.parametrize("amount", [0, -5000])
def test_non_positive_amounts_are_rejected(client, auth_headers, amount):
    category = create_category(client, auth_headers)
    body = {"category_id": category["id"], "amount": amount, "type": "expense", "date": "2026-03-01"}
    assert client.post(f"{API}/transactions", json=body, headers=auth_headers).status_code == 422

    body = {"category_id": category["id"], "amount": amount, "month": 3, "year": 2026}
    assert client.post(f"{API}/budgets", json=body, headers=auth_headers).status_code == 422


def test_transaction_type_must_match_category(client, auth_headers):
    salary = create_category(client, auth_headers, name="Salary", type="income")
    body = {"category_id": salary["id"], "amount": 1000, "type": "expense", "date": "2026-03-01"}
    response = client.post(f"{API}/transactions", json=body, headers=auth_headers)
    assert response.status_code == 422
    assert "does not match" in response.json()["detail"]


def test_list_type_filter_only_accepts_known_values(client, auth_headers):
    assert client.get(f"{API}/transactions?type=refund", headers=auth_headers).status_code == 422


def test_currency_defaults_to_user_currency_and_rejects_others(client, auth_headers):
    category = create_category(client, auth_headers)
    assert create_transaction(client, auth_headers, category["id"])["currency"] == "COP"

    body = {"category_id": category["id"], "amount": 10, "type": "expense", "date": "2026-03-01", "currency": "USD"}
    response = client.post(f"{API}/transactions", json=body, headers=auth_headers)
    assert response.status_code == 422
    assert "Multi-currency is not supported yet" in response.json()["detail"]


def test_deleting_category_in_use_returns_409_with_counts(client, auth_headers):
    category = create_category(client, auth_headers)
    create_transaction(client, auth_headers, category["id"])
    create_transaction(client, auth_headers, category["id"])
    create_budget(client, auth_headers, category["id"])

    response = client.delete(f"{API}/categories/{category['id']}", headers=auth_headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "Category has 2 transactions and 1 budget. Reassign or delete them first."

    unused = create_category(client, auth_headers, name="Unused")
    assert client.delete(f"{API}/categories/{unused['id']}", headers=auth_headers).status_code == 204


def test_duplicate_budget_returns_409(client, auth_headers):
    category = create_category(client, auth_headers)
    create_budget(client, auth_headers, category["id"])
    body = {"category_id": category["id"], "amount": 5000, "month": 3, "year": 2026}
    assert client.post(f"{API}/budgets", json=body, headers=auth_headers).status_code == 409


def test_budget_requires_expense_category(client, auth_headers):
    salary = create_category(client, auth_headers, name="Salary", type="income")
    body = {"category_id": salary["id"], "amount": 5000, "month": 3, "year": 2026}
    assert client.post(f"{API}/budgets", json=body, headers=auth_headers).status_code == 422
