from app.core.categories import DEFAULT_CATEGORIES
from tests.helpers import API, create_category


def test_register_seeds_default_categories(client, auth_headers):
    categories = client.get(f"{API}/categories", headers=auth_headers).json()

    assert sorted((c["name"], c["type"]) for c in categories) == sorted(
        (c["name"], c["type"]) for c in DEFAULT_CATEGORIES
    )
    assert [c["name"] for c in categories if c["type"] == "income"] == ["Salary", "Freelance", "Other income"]
    assert len({c["color"] for c in categories}) == len(categories)  # every color is distinct
    assert all(c["icon"] != "tag" for c in categories)


def test_icon_must_be_in_fixed_set(client, auth_headers):
    body = {"name": "Pets", "type": "expense", "icon": "dog"}
    assert client.post(f"{API}/categories", json=body, headers=auth_headers).status_code == 422

    body = {"name": "Pets", "type": "expense"}
    response = client.post(f"{API}/categories", json=body, headers=auth_headers)
    assert response.status_code == 201
    assert response.json()["icon"] == "tag"


def test_color_must_be_hex(client, auth_headers):
    body = {"name": "Pets", "type": "expense", "color": "red"}
    assert client.post(f"{API}/categories", json=body, headers=auth_headers).status_code == 422


def test_default_categories_mark_fixed_costs(client, auth_headers):
    fixed = {c["name"] for c in client.get(f"{API}/categories", headers=auth_headers).json() if c["is_fixed"]}
    assert fixed == {"Housing", "Utilities"}


def test_is_fixed_on_create_and_update(client, auth_headers):
    gym = create_category(client, auth_headers, name="Gym", is_fixed=True)
    assert gym["is_fixed"] is True
    body = {"name": "Gym", "type": "expense", "color": "#10b981", "icon": "tag", "is_fixed": False}
    response = client.put(f"{API}/categories/{gym['id']}", json=body, headers=auth_headers)
    assert response.status_code == 200 and response.json()["is_fixed"] is False
    # Omitted means not fixed.
    assert create_category(client, auth_headers, name="Pets")["is_fixed"] is False


def test_only_expense_categories_can_be_fixed(client, auth_headers):
    response = client.post(
        f"{API}/categories", json={"name": "Rent income", "type": "income", "is_fixed": True}, headers=auth_headers
    )
    assert response.status_code == 422
    assert "Only expense categories" in response.json()["detail"]

    gym = create_category(client, auth_headers, name="Gym", is_fixed=True)
    body = {"name": "Gym", "type": "income", "color": "#10b981", "icon": "tag", "is_fixed": True}
    assert client.put(f"{API}/categories/{gym['id']}", json=body, headers=auth_headers).status_code == 422
