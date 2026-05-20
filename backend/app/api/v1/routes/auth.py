from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import TokenResponse, UserCreate, UserResponse
from app.services import auth_service

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
def register(body: UserCreate, db: Session = Depends(get_db)):
    user = auth_service.register(
        db,
        name=body.name,
        email=body.email,
        password=body.password,
        currency=body.currency,
    )
    return user


# OAuth2PasswordRequestForm gives us `username` and `password` from form data.
# We treat `username` as the email — this is the standard OAuth2 convention.
@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    token = auth_service.login(db, email=form.username, password=form.password)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    # get_current_user already ran the DB query — we just return the result.
    return current_user
