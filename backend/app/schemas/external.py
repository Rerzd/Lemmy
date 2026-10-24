from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel

# ok: fresh value · stale: the source failed, this is the last good value ·
# unavailable: the source failed and nothing is cached · off: LEMMY_EXTERNAL_DATA is off.
ExternalState = Literal["ok", "stale", "unavailable", "off"]


class SourceInfo(BaseModel):
    id: str
    name: str
    url: str
    terms: str


class SourceStatus(SourceInfo):
    # Last time this source answered with valid data; null if never.
    last_success: Optional[datetime]


class ExternalStatusResponse(BaseModel):
    enabled: bool
    currencies: list[str]
    sources: list[SourceStatus]


class TrmResponse(BaseModel):
    status: ExternalState
    date: date  # the day asked about (Colombia time)
    value: Optional[float]  # COP per USD
    valid_from: Optional[date]
    valid_to: Optional[date]
    source: SourceInfo
    fetched_at: Optional[datetime]
    age_seconds: Optional[int]  # how old fetched_at is
    stale: bool
    message: Optional[str]


class RatesResponse(BaseModel):
    status: ExternalState
    base: str
    rates: dict[str, float]  # units of each currency per 1 base; empty unless ok/stale
    updated_at: Optional[datetime]  # when the source last published these rates
    source: SourceInfo
    fetched_at: Optional[datetime]
    age_seconds: Optional[int]
    stale: bool
    message: Optional[str]
