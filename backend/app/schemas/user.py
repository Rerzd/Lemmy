from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr  # Pydantic validates the email format for us
    password: str
    currency: str = "COP"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    currency: str
    created_at: datetime

    # orm_mode (v1) / from_attributes (v2) tells Pydantic to read data from
    # ORM object attributes instead of expecting a plain dict.
    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
