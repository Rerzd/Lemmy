from typing import Optional
from fastapi import HTTPException, status


def resolve_currency(requested: Optional[str], user_currency: str) -> str:
    # Each user works in a single currency. Summing amounts in different
    # currencies without conversion would give meaningless totals, so we
    # reject anything else until multi-currency support exists.
    if requested is None or requested.upper() == user_currency:
        return user_currency
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=f"Multi-currency is not supported yet. Your account uses {user_currency}.",
    )
