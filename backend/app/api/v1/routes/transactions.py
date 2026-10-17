from datetime import date
from typing import Literal, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionResponse, TransactionUpdate
from app.services import transaction_service

router = APIRouter()


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    response: Response,
    category_id: Optional[int] = Query(None),
    type: Optional[Literal["income", "expense"]] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000),
    q: Optional[str] = Query(None, max_length=100, description="Case-insensitive search in the description"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = transaction_service.list_transactions(
        db,
        user_id=current_user.id,
        category_id=category_id,
        type=type,
        date_from=date_from,
        date_to=date_to,
        month=month,
        year=year,
        q=q,
        limit=limit,
        offset=offset,
    )
    # The body stays a plain list; the total for pagination travels in a header.
    response.headers["X-Total-Count"] = str(total)
    return items


@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(
    body: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return transaction_service.create_transaction(
        db,
        user_id=current_user.id,
        user_currency=current_user.currency,
        category_id=body.category_id,
        amount=body.amount,
        currency=body.currency,
        type=body.type,
        description=body.description,
        date=body.date,
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return transaction_service._get_or_404(db, transaction_id, current_user.id)


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    body: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return transaction_service.update_transaction(
        db,
        user_id=current_user.id,
        user_currency=current_user.currency,
        transaction_id=transaction_id,
        category_id=body.category_id,
        amount=body.amount,
        currency=body.currency,
        type=body.type,
        description=body.description,
        date=body.date,
    )


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction_service.delete_transaction(db, current_user.id, transaction_id)
