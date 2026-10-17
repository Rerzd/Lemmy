API = "/api/v1"


def create_category(client, headers, name="Food", type="expense", **extra):
    response = client.post(f"{API}/categories", json={"name": name, "type": type, **extra}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def create_transaction(client, headers, category_id, amount=10000, type="expense", date="2026-03-10", **extra):
    body = {"category_id": category_id, "amount": amount, "type": type, "date": date, **extra}
    response = client.post(f"{API}/transactions", json=body, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def create_budget(client, headers, category_id, amount=100000, month=3, year=2026):
    body = {"category_id": category_id, "amount": amount, "month": month, "year": year}
    response = client.post(f"{API}/budgets", json=body, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()
