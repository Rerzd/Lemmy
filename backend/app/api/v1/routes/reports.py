from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.reports import CategorySpendingResponse, LivingCostsResponse
from app.services import reports_service
from app.utils.dates import shift_month

router = APIRouter()

# YYYY-MM with a real month; anything else is a 422 in the usual validation envelope.
MONTH_PATTERN = r"^\d{4}-(0[1-9]|1[0-2])$"


@router.get("/living-costs", response_model=LivingCostsResponse)
def living_costs(
    month: Optional[str] = Query(None, pattern=MONTH_PATTERN, description="YYYY-MM, defaults to this month"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    year, month_number = reports_service.parse_month(month, today)
    return reports_service.living_costs(db, current_user.id, year, month_number, today)


@router.get("/category-spending", response_model=CategorySpendingResponse)
def category_spending(
    from_: Optional[str] = Query(None, alias="from", pattern=MONTH_PATTERN, description="YYYY-MM, defaults to 5 months before 'to'"),
    to: Optional[str] = Query(None, pattern=MONTH_PATTERN, description="YYYY-MM, defaults to this month"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    end = reports_service.parse_month(to, today)
    start = reports_service.parse_month(from_, today) if from_ else shift_month(*end, -5)
    return reports_service.category_spending(db, current_user.id, start, end)


@router.get("/export.csv", response_class=Response)
def export_csv(
    month: Optional[str] = Query(None, pattern=MONTH_PATTERN, description="YYYY-MM, defaults to this month"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    year, month_number = reports_service.parse_month(month, date.today())
    body = reports_service.export_csv(db, current_user.id, year, month_number)
    filename = f"lemmy-transactions-{reports_service.month_label(year, month_number)}.csv"
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
