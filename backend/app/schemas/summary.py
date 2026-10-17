from typing import Literal, Optional
from pydantic import BaseModel


class PeriodTotals(BaseModel):
    income: float
    expense: float
    net: float


class ChangePct(BaseModel):
    # Percent change vs the previous month (12.5 means +12.5 %); null when the
    # previous value is 0 and the change is undefined.
    income: Optional[float]
    expense: Optional[float]
    net: Optional[float]


class OverviewResponse(BaseModel):
    month: int
    year: int
    income: float
    expense: float
    net: float
    # net / income as a ratio (0.25 = 25 %); null when there is no income.
    savings_rate: Optional[float]
    transaction_count: int
    previous: PeriodTotals
    change_pct: ChangePct


class CategoryTotal(BaseModel):
    category_id: int
    name: str
    color: str
    icon: str
    total: float
    # Fraction of the month's total for this type (0..1).
    share: float
    count: int


class TrendPoint(BaseModel):
    year: int
    month: int
    income: float
    expense: float
    net: float


class BudgetStatus(BaseModel):
    budget_id: int
    category_id: int
    name: str
    color: str
    icon: str
    budgeted: float
    spent: float
    remaining: float
    # Percent of the budget used (85.0 = 85 %).
    pct_used: float
    status: Literal["ok", "warning", "over"]
