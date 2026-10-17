from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import date


class TransactionCreate(BaseModel):
    category_id: int
    # gt=0: the sign comes from `type`, so a zero or negative amount is always a mistake.
    amount: float = Field(gt=0)
    # Optional: the service fills in the user's currency when omitted.
    currency: Optional[str] = None
    type: Literal["income", "expense"]
    description: Optional[str] = None
    date: date


class TransactionUpdate(BaseModel):
    category_id: int
    amount: float = Field(gt=0)
    currency: Optional[str] = None
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
