from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.external import ExternalStatusResponse, RatesResponse, TrmResponse
from app.services import external_service

router = APIRouter()

# Every route answers 200 with a "status" field (ok, stale, unavailable or off), so an
# outage upstream is a state the UI can show, not an error. Only bad input is a 422.


@router.get("/status", response_model=ExternalStatusResponse)
def external_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return external_service.get_status(db)


@router.get("/trm", response_model=TrmResponse)
def trm(
    date_: Optional[date] = Query(None, alias="date", description="YYYY-MM-DD, defaults to today in Colombia"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return external_service.get_trm(db, date_)


@router.get("/rates", response_model=RatesResponse)
def rates(
    base: str = Query("USD", max_length=3, description="Three-letter code from the supported list"),
    symbols: Optional[str] = Query(None, max_length=64, description="Comma-separated codes, defaults to all supported"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = external_service.parse_currency(base)
    return external_service.get_rates(db, base, external_service.parse_symbols(symbols, base))
