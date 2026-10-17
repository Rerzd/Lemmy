from typing import Optional
from pydantic import BaseModel, Field, field_validator


class BudgetCreate(BaseModel):
    category_id: int
    amount: float = Field(gt=0)
    # Optional: the service fills in the user's currency when omitted.
    currency: Optional[str] = None
    month: int
    year: int

    # Pydantic v2 validator — runs after type coercion, before the object is built.
    # We keep month/year validation here so the service doesn't have to worry about it.
    @field_validator("month")
    @classmethod
    def validate_month(cls, v: int) -> int:
        if not 1 <= v <= 12:
            raise ValueError("month must be between 1 and 12")
        return v

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        if v < 2000:
            raise ValueError("year must be 2000 or later")
        return v


class BudgetUpdate(BaseModel):
    amount: float = Field(gt=0)
    currency: Optional[str] = None


class BudgetResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    amount: float
    currency: str
    month: int
    year: int

    model_config = {"from_attributes": True}
