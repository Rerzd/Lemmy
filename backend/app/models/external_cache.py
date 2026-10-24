from sqlalchemy import Column, Date, DateTime, String, Text
from app.core.database import Base


class ExternalCache(Base):
    """Last good answer from an external source (TRM, exchange rates), one row per key.

    Only validated data is stored: a failed or malformed response never replaces a row,
    so an outage can still be served from here, flagged as stale.
    """
    __tablename__ = "external_cache"

    key = Column(String, primary_key=True)  # e.g. "trm:2026-10-24", "rates:USD"
    payload = Column(Text, nullable=False)  # JSON, already validated and trimmed
    source = Column(String, nullable=False)  # "trm" | "rates"
    fetched_at = Column(DateTime(timezone=True), nullable=False)  # last successful fetch (UTC)
    valid_for = Column(Date, nullable=True)  # the day the value applies to, when it has one
