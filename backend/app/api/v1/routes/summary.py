from typing import Literal, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.summary import CategoryTotal, OverviewResponse, TrendPoint
from app.services import summary_service

router = APIRouter()


@router.get("/overview", response_model=OverviewResponse)
def overview(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month, year = summary_service.resolve_period(month, year)
    return summary_service.overview(db, current_user.id, month, year)


@router.get("/by-category", response_model=list[CategoryTotal])
def by_category(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000),
    type: Literal["income", "expense"] = Query("expense"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month, year = summary_service.resolve_period(month, year)
    return summary_service.by_category(db, current_user.id, month, year, type)


@router.get("/trend", response_model=list[TrendPoint])
def trend(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return summary_service.trend(db, current_user.id, months)
