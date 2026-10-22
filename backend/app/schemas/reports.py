from typing import Optional
from pydantic import BaseModel

# Conventions match schemas/summary.py: *_share fields are ratios (0..1),
# *_pct fields are percents (12.5 = 12.5 %).


class CostSplit(BaseModel):
    fixed: float
    variable: float
    total: float
    # fixed / total as a ratio; null when total is 0.
    fixed_share: Optional[float]


class LivingCostCategory(BaseModel):
    category_id: int
    name: str
    color: str
    icon: str
    is_fixed: bool
    this_month: float
    # Average per month over the baseline months; null without any history.
    baseline: Optional[float]
    # Percent change of this month vs the baseline; null when the baseline is null or 0.
    change_pct: Optional[float]


class LivingCostsResponse(BaseModel):
    month: str  # YYYY-MM
    # How many complete months (0..3) the baseline averages, and which ones.
    months_used: int
    baseline_months: list[str]
    this_month: CostSplit
    baseline: Optional[CostSplit]
    # Income needed each month to cover the baseline expenses.
    min_monthly_income: Optional[float]
    # All-time income minus all-time expenses, floored at 0.
    savings: float
    # Months of baseline expenses the savings cover; null when the baseline is null or 0.
    cushion_months: Optional[float]
    categories: list[LivingCostCategory]


class CategorySpendingRow(BaseModel):
    category_id: int
    name: str
    color: str
    icon: str
    is_fixed: bool
    # One value per entry in CategorySpendingResponse.months.
    totals: list[float]
    total: float


class CategorySpendingResponse(BaseModel):
    months: list[str]  # YYYY-MM, oldest first
    categories: list[CategorySpendingRow]
    # Sum of every category for each month.
    totals: list[float]
