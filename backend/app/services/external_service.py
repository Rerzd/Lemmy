"""External data: the TRM (official COP/USD rate) and exchange rates, behind a cache.

How a value is served:
  1. A cache row younger than its TTL is returned as is (no request).
  2. Otherwise one request per key goes to the source; requests for the same key wait for
     it instead of firing their own (no stampede), then read what it stored.
  3. If the source fails, the last good row is returned flagged stale, and the source is
     left alone for FAILURE_COOLDOWN before it's tried again.
  4. With no row at all the answer is "unavailable"; with LEMMY_EXTERNAL_DATA off, "off".
Errors never reach the cache: only payloads that passed validation are stored.
"""
import json
import logging
import math
import threading
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.external_cache import ExternalCache
from app.services import external_http
from app.services.external_http import ExternalDataOff, UpstreamError

logger = logging.getLogger(__name__)

# Fixed sources. Only query parameters built here are added to these URLs.
TRM_URL = "https://www.datos.gov.co/resource/32sa-8pi3.json"
RATES_URL = "https://open.er-api.com/v6/latest/USD"

SOURCES = {
    "trm": {
        "id": "trm",
        "name": "TRM by Superintendencia Financiera de Colombia, via datos.gov.co",
        "url": "https://www.datos.gov.co/d/32sa-8pi3",
        "terms": "Open data, CC BY-SA 4.0",
    },
    "rates": {
        "id": "rates",
        "name": "Rates By Exchange Rate API",
        "url": "https://www.exchangerate-api.com",
        "terms": "https://www.exchangerate-api.com/terms",
    },
}

# Currencies the converter offers. Every one must be present in the rates payload.
SUPPORTED_CURRENCIES = ("COP", "USD", "EUR", "MXN", "GBP", "CAD", "BRL", "CLP", "PEN", "ARS")

RATES_TTL = timedelta(hours=6)  # the source refreshes once a day
TRM_TODAY_TTL = timedelta(hours=6)
TRM_PAST_TTL = timedelta(days=30)  # a past day's TRM never changes
TRM_PENDING_TTL = timedelta(hours=1)  # the row found doesn't cover the day yet
FAILURE_COOLDOWN = 60.0  # seconds before retrying a source that just failed
FIRST_TRM_DATE = date(1991, 12, 2)

# Colombia has no daylight saving time, so a fixed offset is exact.
BOGOTA = timezone(timedelta(hours=-5), "America/Bogota")

OFF_MESSAGE = "External data is off."


def _now() -> datetime:
    return datetime.now(timezone.utc)


def today_in_colombia() -> date:
    return _now().astimezone(BOGOTA).date()


# --- cache -------------------------------------------------------------------------------

@dataclass
class Cached:
    payload: dict[str, Any]
    fetched_at: datetime
    valid_for: Optional[date]
    stale: bool


_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()
_failed_at: dict[str, float] = {}


def reset_state() -> None:
    """Forgets in-memory locks and failure cooldowns (used by tests)."""
    with _locks_guard:
        _locks.clear()
        _failed_at.clear()


def _lock_for(key: str) -> threading.Lock:
    with _locks_guard:
        return _locks.setdefault(key, threading.Lock())


def _aware(moment: datetime) -> datetime:
    # SQLite hands back naive datetimes; everything stored here is UTC.
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def _read(db: Session, key: str) -> Optional[ExternalCache]:
    # populate_existing: re-read the row even if this session loaded it before the wait.
    return db.query(ExternalCache).filter(ExternalCache.key == key).populate_existing().one_or_none()


def _as_cached(row: ExternalCache, stale: bool) -> Cached:
    return Cached(json.loads(row.payload), _aware(row.fetched_at), row.valid_for, stale)


def _store(db: Session, key: str, source: str, payload: dict, valid_for: Optional[date], now: datetime) -> None:
    row = db.get(ExternalCache, key) or ExternalCache(key=key)
    row.payload = json.dumps(payload)
    row.source = source
    row.fetched_at = now
    row.valid_for = valid_for
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        # Another process stored the same key first; its value is just as good.
        db.rollback()


def _cached_or_fetch(
    db: Session,
    key: str,
    source: str,
    ttl_for: Callable[[dict], timedelta],
    fetch: Callable[[], tuple[dict, Optional[date]]],
) -> Optional[Cached]:
    def fresh(row: Optional[ExternalCache]) -> bool:
        return row is not None and _now() - _aware(row.fetched_at) < ttl_for(json.loads(row.payload))

    row = _read(db, key)
    if fresh(row):
        return _as_cached(row, stale=False)

    with _lock_for(key):
        row = _read(db, key)  # someone may have refreshed it while we waited
        if fresh(row):
            return _as_cached(row, stale=False)

        failed_at = _failed_at.get(key)
        if failed_at is None or time.monotonic() - failed_at >= FAILURE_COOLDOWN:
            try:
                payload, valid_for = fetch()
            except UpstreamError as e:
                logger.warning("External source %s failed for %s: %s", source, key, e)
                _failed_at[key] = time.monotonic()
            else:
                _failed_at.pop(key, None)
                now = _now()
                _store(db, key, source, payload, valid_for, now)
                return Cached(payload, now, valid_for, stale=False)

    return _as_cached(row, stale=True) if row is not None else None


def _age_seconds(moment: datetime) -> int:
    return max(0, int((_now() - moment).total_seconds()))


# --- validation helpers -------------------------------------------------------------------

def _positive_number(value: Any, what: str) -> float:
    # The TRM API sends numbers as strings ("3158.43"); the rates API sends JSON numbers.
    if isinstance(value, bool):
        raise UpstreamError(f"{what} is not a number")
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise UpstreamError(f"{what} is not a number") from None
    if not math.isfinite(number) or number <= 0:
        raise UpstreamError(f"{what} is not a positive number")
    return number


def _iso_day(value: Any, what: str) -> date:
    try:
        return datetime.fromisoformat(value).date()
    except (TypeError, ValueError):
        raise UpstreamError(f"{what} is not a date") from None


# --- TRM ----------------------------------------------------------------------------------

def _fetch_trm(day: date) -> tuple[dict, Optional[date]]:
    # The latest row that starts on or before the day. A TRM published on a Friday is
    # usually valid until Monday, so validity is a range (vigenciadesde..vigenciahasta).
    data = external_http.fetch_json(TRM_URL, {
        "$select": "valor,unidad,vigenciadesde,vigenciahasta",
        "$where": f"vigenciadesde <= '{day.isoformat()}T00:00:00.000'",
        "$order": "vigenciadesde DESC",
        "$limit": "1",
    })
    if not isinstance(data, list) or len(data) != 1 or not isinstance(data[0], dict):
        raise UpstreamError("expected a list with one TRM row")
    row = data[0]
    if row.get("unidad") != "COP":
        raise UpstreamError("the TRM row is not in COP")
    value = _positive_number(row.get("valor"), "valor")
    valid_from = _iso_day(row.get("vigenciadesde"), "vigenciadesde")
    valid_to = _iso_day(row.get("vigenciahasta"), "vigenciahasta")
    if valid_from > day or valid_to < valid_from:
        raise UpstreamError("the TRM validity dates are inconsistent")
    payload = {"value": value, "valid_from": valid_from.isoformat(), "valid_to": valid_to.isoformat(), "day": day.isoformat()}
    return payload, day


def get_trm(db: Session, day: Optional[date] = None) -> dict:
    today = today_in_colombia()
    day = day or today
    if day > today:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="The date can't be in the future (Colombia time).")
    if day < FIRST_TRM_DATE:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="There is no TRM before 1991-12-02.")

    base = {"date": day, "source": SOURCES["trm"], "value": None, "valid_from": None, "valid_to": None,
            "fetched_at": None, "age_seconds": None, "stale": False}
    if not settings.LEMMY_EXTERNAL_DATA:
        return {**base, "status": "off", "message": OFF_MESSAGE}

    def ttl_for(payload: dict) -> timedelta:
        if date.fromisoformat(payload["valid_to"]) < day:
            return TRM_PENDING_TTL
        return TRM_PAST_TTL if day < today_in_colombia() else TRM_TODAY_TTL

    try:
        cached = _cached_or_fetch(db, f"trm:{day.isoformat()}", "trm", ttl_for, lambda: _fetch_trm(day))
    except ExternalDataOff:
        return {**base, "status": "off", "message": OFF_MESSAGE}
    if cached is None:
        return {**base, "status": "unavailable", "message": "The TRM is unavailable right now."}

    p = cached.payload
    return {
        **base,
        "status": "stale" if cached.stale else "ok",
        "value": p["value"],
        "valid_from": date.fromisoformat(p["valid_from"]),
        "valid_to": date.fromisoformat(p["valid_to"]),
        "fetched_at": cached.fetched_at,
        "age_seconds": _age_seconds(cached.fetched_at),
        "stale": cached.stale,
        "message": "Showing the last known value." if cached.stale else None,
    }


# --- exchange rates -------------------------------------------------------------------------

def _fetch_rates() -> tuple[dict, Optional[date]]:
    data = external_http.fetch_json(RATES_URL)
    if not isinstance(data, dict) or data.get("result") != "success" or data.get("base_code") != "USD":
        raise UpstreamError("unexpected rates payload")
    rates = data.get("rates")
    if not isinstance(rates, dict):
        raise UpstreamError("rates are missing")
    kept = {code: _positive_number(rates.get(code), f"rate for {code}") for code in SUPPORTED_CURRENCIES}
    updated_unix = data.get("time_last_update_unix")
    if isinstance(updated_unix, bool) or not isinstance(updated_unix, int) or updated_unix <= 0:
        raise UpstreamError("time_last_update_unix is missing")
    updated_at = datetime.fromtimestamp(updated_unix, timezone.utc)
    return {"rates": kept, "updated_at": updated_at.isoformat()}, updated_at.date()


def parse_currency(code: str) -> str:
    if code not in SUPPORTED_CURRENCIES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Unsupported currency code '{code[:12]}'. Use one of: {', '.join(SUPPORTED_CURRENCIES)}.",
        )
    return code


def parse_symbols(raw: Optional[str], base: str) -> list[str]:
    if raw is None:
        return [c for c in SUPPORTED_CURRENCIES if c != base]
    codes = [parse_currency(code.strip()) for code in raw.split(",")]
    return list(dict.fromkeys(codes))  # drop repeats, keep order


def get_rates(db: Session, base: str, symbols: list[str]) -> dict:
    out = {"base": base, "rates": {}, "updated_at": None, "source": SOURCES["rates"],
           "fetched_at": None, "age_seconds": None, "stale": False}
    if not settings.LEMMY_EXTERNAL_DATA:
        return {**out, "status": "off", "message": OFF_MESSAGE}
    try:
        cached = _cached_or_fetch(db, "rates:USD", "rates", lambda _: RATES_TTL, _fetch_rates)
    except ExternalDataOff:
        return {**out, "status": "off", "message": OFF_MESSAGE}
    if cached is None:
        return {**out, "status": "unavailable", "message": "Exchange rates are unavailable right now."}

    usd = cached.payload["rates"]
    # Everything is stored against USD; any other base is a cross rate. 10 significant
    # digits is far more than any display needs and hides float noise like 0.30000000000000004.
    rates = {code: float(f"{usd[code] / usd[base]:.10g}") for code in symbols}
    return {
        **out,
        "status": "stale" if cached.stale else "ok",
        "rates": rates,
        "updated_at": datetime.fromisoformat(cached.payload["updated_at"]),
        "fetched_at": cached.fetched_at,
        "age_seconds": _age_seconds(cached.fetched_at),
        "stale": cached.stale,
        "message": "Showing the last known rates." if cached.stale else None,
    }


# --- status ---------------------------------------------------------------------------------

def get_status(db: Session) -> dict:
    sources = []
    for source in SOURCES.values():
        last = db.query(func.max(ExternalCache.fetched_at)).filter(ExternalCache.source == source["id"]).scalar()
        sources.append({**source, "last_success": _aware(last) if last else None})
    return {"enabled": settings.LEMMY_EXTERNAL_DATA, "currencies": list(SUPPORTED_CURRENCIES), "sources": sources}
