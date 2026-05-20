from pydantic import BaseModel
from typing import Literal, Optional
from datetime import date


class TransactionCreate(BaseModel):
    category_id: int
    amount: float
    currency: str = "COP"
    type: Literal["income", "expense"]
    description: Optional[str] = None
    date: date


class TransactionUpdate(BaseModel):
    category_id: int
    amount: float
    currency: str = "COP"
    type: Literal["income", "expense"]
    description: Optional[str] = None
    date: date


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    amount: float
    currency: str
    type: str
    description: Optional[str]
    date: date

    model_config = {"from_attributes": True}
