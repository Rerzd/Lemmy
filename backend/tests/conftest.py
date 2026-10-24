import os

# Must be set before importing the app: settings and the engine are created at import time.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["LEMMY_EXTERNAL_DATA"] = "on"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app import models  # noqa: F401  (registers every table on Base.metadata)
from app.services import external_http, external_service

# StaticPool reuses one connection, so every session sees the same in-memory DB.
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection, _):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _no_network(request, timeout):
    raise AssertionError(f"A test tried to reach the network: {request.full_url}")


@pytest.fixture(autouse=True)
def no_real_network(monkeypatch):
    # Every outgoing request goes through external_http._open; tests that need a source
    # replace it with a fake. Anything else fails loudly instead of calling the internet.
    monkeypatch.setattr(external_http, "_open", _no_network)
    monkeypatch.setattr(settings, "LEMMY_EXTERNAL_DATA", True)
    external_service.reset_state()
    yield
    external_service.reset_state()


@pytest.fixture()
def db():
    # Fresh schema per test keeps tests independent of each other.
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def register_and_login(client, email="ana@example.com", password="secret123", name="Ana", currency="COP"):
    client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": password, "currency": currency},
    )
    response = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture()
def auth_headers(client):
    return register_and_login(client)
