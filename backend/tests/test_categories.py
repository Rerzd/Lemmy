from app.core.categories import DEFAULT_CATEGORIES
from tests.helpers import API


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
