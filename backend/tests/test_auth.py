def test_register_login_and_me(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "ana@example.com", "password": "secret123"},
    )
    assert response.status_code == 201
    assert response.json()["currency"] == "COP"

    response = client.post(
        "/api/v1/auth/login", data={"username": "ana@example.com", "password": "secret123"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "ana@example.com"


def test_register_duplicate_email_returns_409(client):
    body = {"name": "Ana", "email": "ana@example.com", "password": "secret123"}
    assert client.post("/api/v1/auth/register", json=body).status_code == 201
    assert client.post("/api/v1/auth/register", json=body).status_code == 409


def test_login_wrong_password_returns_401(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "ana@example.com", "password": "secret123"},
    )
    response = client.post("/api/v1/auth/login", data={"username": "ana@example.com", "password": "nope"})
    assert response.status_code == 401


def test_me_without_token_returns_401(client):
    assert client.get("/api/v1/auth/me").status_code == 401
