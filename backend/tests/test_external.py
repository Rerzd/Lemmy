import json
import threading
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base
from app.models.external_cache import ExternalCache
from app.services import external_http, external_service
from app.services.external_http import UpstreamError
from tests.helpers import API

TRM_ROW = {"valor": "3158.43", "unidad": "COP", "vigenciadesde": "2026-10-24T00:00:00.000", "vigenciahasta": "2026-10-26T00:00:00.000"}
RATES = {
    "result": "success",
    "base_code": "USD",
    "time_last_update_unix": 1792800151,  # Sat, 24 Oct 2026 00:02:31 UTC
    "rates": {"USD": 1, "COP": 3179.863094, "EUR": 0.86, "MXN": 18.25, "GBP": 0.75, "CAD": 1.4,
              "BRL": 5.04284, "CLP": 984.682493, "PEN": 3.4, "ARS": 1528.263, "JPY": 152.1},
}


class FakeResponse:
    def __init__(self, body: bytes, status=200, headers=None, chunk_delay=0.0, chunk_size=None):
        self.status = status
        self.headers = headers or {}
        self._body = body
        self._delay = chunk_delay
        self._chunk_size = chunk_size

    def read(self, n):
        if self._delay:
            time.sleep(self._delay)
        size = min(n, self._chunk_size or n)
        chunk, self._body = self._body[:size], self._body[size:]
        return chunk

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeUpstream:
    """Stands in for external_http._open. Answers per host; records every request."""

    def __init__(self):
        self.calls: list[urllib.request.Request] = []
        self.timeouts: list[float] = []
        self.answers = {
            "www.datos.gov.co": lambda: FakeResponse(json.dumps([TRM_ROW]).encode()),
            "open.er-api.com": lambda: FakeResponse(json.dumps(RATES).encode()),
        }

    def __call__(self, request, timeout):
        self.calls.append(request)
        self.timeouts.append(timeout)
        answer = self.answers[urlsplit(request.full_url).netloc]
        return answer()

    def fail(self, host, error: Exception):
        def raise_():
            raise error
        self.answers[host] = raise_

    def respond(self, host, body: bytes, **kwargs):
        self.answers[host] = lambda: FakeResponse(body, **kwargs)

    def count(self, host):
        return sum(urlsplit(r.full_url).netloc == host for r in self.calls)


TRM_HOST, RATES_HOST = "www.datos.gov.co", "open.er-api.com"


class Clock:
    def __init__(self):
        self.now = datetime(2026, 10, 24, 15, 0, tzinfo=timezone.utc)  # 10:00 in Bogotá

    def advance(self, **delta):
        self.now += timedelta(**delta)


@pytest.fixture()
def upstream(monkeypatch):
    fake = FakeUpstream()
    monkeypatch.setattr(external_http, "_open", fake)
    return fake


@pytest.fixture()
def clock(monkeypatch):
    c = Clock()
    monkeypatch.setattr(external_service, "_now", lambda: c.now)
    return c


def _trm(client, headers, **params):
    response = client.get(f"{API}/external/trm", params=params, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def _rates(client, headers, **params):
    response = client.get(f"{API}/external/rates", params=params, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_external_endpoints_require_auth(client):
    for path in ("status", "trm", "rates"):
        assert client.get(f"{API}/external/{path}").status_code == 401


def test_trm_success(client, auth_headers, upstream, clock):
    body = _trm(client, auth_headers)
    assert body["status"] == "ok"
    assert body["value"] == 3158.43
    assert (body["date"], body["valid_from"], body["valid_to"]) == ("2026-10-24", "2026-10-24", "2026-10-26")
    assert body["stale"] is False and body["age_seconds"] == 0
    assert body["source"]["id"] == "trm"

    request = upstream.calls[0]
    url = urlsplit(request.full_url)
    assert (url.scheme, url.netloc, url.path) == ("https", "www.datos.gov.co", "/resource/32sa-8pi3.json")
    query = parse_qs(url.query)
    assert query["$where"] == ["vigenciadesde <= '2026-10-24T00:00:00.000'"]
    assert query["$order"] == ["vigenciadesde DESC"] and query["$limit"] == ["1"]
    assert request.get_header("User-agent").startswith("Lemmy/")
    assert upstream.timeouts[0] <= 5


def test_trm_cached_hit_makes_no_second_request(client, auth_headers, upstream, clock):
    _trm(client, auth_headers)
    clock.advance(hours=2)
    body = _trm(client, auth_headers)
    assert body["status"] == "ok" and body["age_seconds"] == 2 * 3600
    assert upstream.count(TRM_HOST) == 1


def test_trm_ttl_expiry_refetches(client, auth_headers, upstream, clock):
    _trm(client, auth_headers)
    clock.advance(hours=6, seconds=1)
    body = _trm(client, auth_headers)
    assert body["status"] == "ok" and body["age_seconds"] == 0
    assert upstream.count(TRM_HOST) == 2


def test_past_trm_days_are_kept_longer(client, auth_headers, upstream, clock):
    upstream.respond(TRM_HOST, json.dumps([{**TRM_ROW, "vigenciadesde": "2026-10-01T00:00:00.000", "vigenciahasta": "2026-10-01T00:00:00.000"}]).encode())
    assert _trm(client, auth_headers, date="2026-10-01")["status"] == "ok"
    clock.advance(days=29)
    _trm(client, auth_headers, date="2026-10-01")
    assert upstream.count(TRM_HOST) == 1
    clock.advance(days=2)
    _trm(client, auth_headers, date="2026-10-01")
    assert upstream.count(TRM_HOST) == 2


def test_trm_not_yet_published_is_rechecked_soon(client, auth_headers, upstream, clock):
    # Latest row ends the day before: the day's own TRM may appear soon, so a short TTL.
    upstream.respond(TRM_HOST, json.dumps([{**TRM_ROW, "vigenciadesde": "2026-10-23T00:00:00.000", "vigenciahasta": "2026-10-23T00:00:00.000"}]).encode())
    body = _trm(client, auth_headers)
    assert (body["status"], body["valid_to"]) == ("ok", "2026-10-23")
    clock.advance(minutes=61)
    _trm(client, auth_headers)
    assert upstream.count(TRM_HOST) == 2


def test_source_failure_serves_stale_cache(client, auth_headers, upstream, clock, db):
    _trm(client, auth_headers)
    clock.advance(hours=7)
    upstream.fail(TRM_HOST, urllib.error.URLError("Name or service not known"))
    body = _trm(client, auth_headers)
    assert body["status"] == "stale" and body["stale"] is True
    assert body["value"] == 3158.43
    assert body["age_seconds"] == 7 * 3600
    assert body["message"] == "Showing the last known value."
    # The failure didn't touch the stored row.
    row = db.get(ExternalCache, "trm:2026-10-24")
    assert json.loads(row.payload)["value"] == 3158.43


def test_failed_source_is_not_retried_during_the_cooldown(client, auth_headers, upstream, clock, monkeypatch):
    upstream.fail(TRM_HOST, urllib.error.URLError("down"))
    assert _trm(client, auth_headers)["status"] == "unavailable"
    assert _trm(client, auth_headers)["status"] == "unavailable"
    assert upstream.count(TRM_HOST) == 1
    monkeypatch.setattr(external_service, "FAILURE_COOLDOWN", 0)
    upstream.respond(TRM_HOST, json.dumps([TRM_ROW]).encode())
    assert _trm(client, auth_headers)["status"] == "ok"
    assert upstream.count(TRM_HOST) == 2


def test_source_failure_without_cache_is_unavailable(client, auth_headers, upstream, clock):
    upstream.fail(TRM_HOST, urllib.error.HTTPError("https://x", 503, "Service Unavailable", {}, None))
    body = _trm(client, auth_headers)
    assert body["status"] == "unavailable"
    assert body["value"] is None and body["fetched_at"] is None
    assert body["message"] == "The TRM is unavailable right now."
    upstream.fail(RATES_HOST, urllib.error.HTTPError("https://x", 429, "Too Many Requests", {}, None))
    rates = _rates(client, auth_headers)
    assert (rates["status"], rates["rates"]) == ("unavailable", {})


def test_timeout_is_unavailable(client, auth_headers, upstream, clock):
    upstream.fail(TRM_HOST, TimeoutError("timed out"))
    assert _trm(client, auth_headers)["status"] == "unavailable"


def test_slow_body_hits_the_total_deadline(upstream, monkeypatch):
    # One byte every 20 ms never trips the per-read socket timeout; the total deadline does.
    monkeypatch.setattr(external_http, "TIMEOUT_SECONDS", 0.1)
    upstream.respond(TRM_HOST, b"[" + b" " * 1000 + b"]", chunk_delay=0.02, chunk_size=1)
    with pytest.raises(UpstreamError, match="timed out"):
        external_http.fetch_json(external_service.TRM_URL)


@pytest.mark.parametrize("payload", [
    b"<html>Service down</html>",
    b"[]",
    json.dumps({"error": True}).encode(),
    json.dumps([{**TRM_ROW, "valor": "abc"}]).encode(),
    json.dumps([{**TRM_ROW, "valor": "-1"}]).encode(),
    json.dumps([{**TRM_ROW, "unidad": "USD"}]).encode(),
    json.dumps([{**TRM_ROW, "vigenciadesde": "yesterday"}]).encode(),
    json.dumps([{**TRM_ROW, "vigenciadesde": "2026-10-25T00:00:00.000"}]).encode(),
])
def test_malformed_trm_is_unavailable_and_not_cached(client, auth_headers, upstream, clock, db, payload):
    upstream.respond(TRM_HOST, payload)
    assert _trm(client, auth_headers)["status"] == "unavailable"
    assert db.query(ExternalCache).count() == 0


@pytest.mark.parametrize("change", [
    {"result": "error", "error-type": "unsupported-code"},
    {"base_code": "EUR"},
    {"rates": {**RATES["rates"], "COP": None}},
    {"rates": {k: v for k, v in RATES["rates"].items() if k != "COP"}},
    {"rates": {**RATES["rates"], "EUR": True}},
    {"time_last_update_unix": "yesterday"},
])
def test_malformed_rates_are_unavailable_and_not_cached(client, auth_headers, upstream, clock, db, change):
    upstream.respond(RATES_HOST, json.dumps({**RATES, **change}).encode())
    assert _rates(client, auth_headers)["status"] == "unavailable"
    assert db.query(ExternalCache).count() == 0


def test_oversized_payload_is_rejected(client, auth_headers, upstream, clock, db):
    big = json.dumps([TRM_ROW] + [{"pad": "x" * 1000}] * 100).encode()
    assert len(big) > external_http.MAX_BYTES
    upstream.respond(TRM_HOST, big)
    assert _trm(client, auth_headers)["status"] == "unavailable"
    # A declared Content-Length over the limit is refused before reading anything.
    upstream.respond(TRM_HOST, b"[]", headers={"Content-Length": str(10 * external_http.MAX_BYTES)})
    with pytest.raises(UpstreamError, match="too large"):
        external_http.fetch_json(external_service.TRM_URL)
    assert db.query(ExternalCache).count() == 0


def test_redirects_are_refused():
    handler = external_http._NoRedirect()
    request = urllib.request.Request(external_service.RATES_URL)
    with pytest.raises(UpstreamError, match="redirect"):
        handler.redirect_request(request, None, 302, "Found", {}, "https://evil.example/latest")


def test_rates_success_and_cross_rates(client, auth_headers, upstream, clock):
    body = _rates(client, auth_headers, base="USD", symbols="COP,EUR")
    assert body["status"] == "ok"
    assert body["rates"] == {"COP": 3179.863094, "EUR": 0.86}
    assert body["updated_at"].startswith("2026-10-24T00:02:31")
    assert body["source"]["name"] == "Rates By Exchange Rate API"
    # Any base comes from the same cached USD table: no second request.
    eur = _rates(client, auth_headers, base="EUR", symbols="COP,USD,COP")
    assert eur["rates"] == {"COP": pytest.approx(3179.863094 / 0.86, rel=1e-9), "USD": pytest.approx(1 / 0.86, rel=1e-9)}
    default = _rates(client, auth_headers, base="COP")
    assert "COP" not in default["rates"] and set(default["rates"]) == set(external_service.SUPPORTED_CURRENCIES) - {"COP"}
    assert upstream.count(RATES_HOST) == 1
    url = urlsplit(upstream.calls[0].full_url)
    assert (url.netloc, url.path, url.query) == ("open.er-api.com", "/v6/latest/USD", "")


def test_rates_ttl_and_stale(client, auth_headers, upstream, clock):
    _rates(client, auth_headers)
    clock.advance(hours=5)
    _rates(client, auth_headers)
    assert upstream.count(RATES_HOST) == 1
    clock.advance(hours=2)
    upstream.fail(RATES_HOST, TimeoutError())
    body = _rates(client, auth_headers, symbols="COP")
    assert (body["status"], body["stale"], body["age_seconds"]) == ("stale", True, 7 * 3600)
    assert body["rates"] == {"COP": 3179.863094}
    assert upstream.count(RATES_HOST) == 2


@pytest.mark.parametrize("params", [
    {"base": "usd"},
    {"base": "XXX"},
    {"base": "DOLLAR"},
    {"base": "JPY"},  # a real currency, but not in the supported list
    {"symbols": "COP,ZZZ"},
    {"symbols": ""},
    {"symbols": "COP,,EUR"},
    {"symbols": "C0P"},
])
def test_invalid_currency_codes_are_422(client, auth_headers, upstream, params):
    response = client.get(f"{API}/external/rates", params=params, headers=auth_headers)
    assert response.status_code == 422
    assert "detail" in response.json()
    assert upstream.calls == []


def test_trm_date_must_be_valid(client, auth_headers, upstream, clock):
    for value, code in (("2026-10-25", 422), ("1990-01-01", 422), ("not-a-date", 422)):
        assert client.get(f"{API}/external/trm", params={"date": value}, headers=auth_headers).status_code == code
    assert upstream.calls == []


def test_feature_off_makes_no_request(client, auth_headers, upstream, clock, monkeypatch, db):
    monkeypatch.setattr(settings, "LEMMY_EXTERNAL_DATA", False)
    status = client.get(f"{API}/external/status", headers=auth_headers).json()
    assert status["enabled"] is False
    trm = _trm(client, auth_headers)
    assert (trm["status"], trm["message"], trm["value"]) == ("off", "External data is off.", None)
    rates = _rates(client, auth_headers, base="USD", symbols="COP")
    assert (rates["status"], rates["rates"]) == ("off", {})
    assert upstream.calls == []
    # Even a direct call to the HTTP layer refuses to go out.
    with pytest.raises(external_http.ExternalDataOff):
        external_http.fetch_json(external_service.TRM_URL)
    assert upstream.calls == []


def test_status_reports_last_success(client, auth_headers, upstream, clock):
    status = client.get(f"{API}/external/status", headers=auth_headers).json()
    assert status["enabled"] is True
    assert "COP" in status["currencies"]
    assert {s["id"]: s["last_success"] for s in status["sources"]} == {"trm": None, "rates": None}
    _trm(client, auth_headers)
    status = client.get(f"{API}/external/status", headers=auth_headers).json()
    last = {s["id"]: s["last_success"] for s in status["sources"]}
    assert last["trm"].startswith("2026-10-24T15:00:00") and last["rates"] is None


def test_concurrent_requests_do_not_stampede(tmp_path, upstream, clock):
    # A file database so each thread gets its own connection, like real requests do.
    engine = create_engine(f"sqlite:///{tmp_path / 'cache.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    def slow_rates():
        time.sleep(0.2)
        return FakeResponse(json.dumps(RATES).encode())
    upstream.answers[RATES_HOST] = slow_rates

    results = []

    def worker():
        with Session() as session:
            results.append(external_service.get_rates(session, "USD", ["COP"])["status"])

    threads = [threading.Thread(target=worker) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert results == ["ok"] * 8
    assert upstream.count(RATES_HOST) == 1
    engine.dispose()


def test_today_follows_colombia_time(clock):
    clock.now = datetime(2026, 10, 25, 3, 0, tzinfo=timezone.utc)  # still the 24th in Bogotá
    assert external_service.today_in_colombia() == date(2026, 10, 24)
