from fastapi import APIRouter
from app.api.v1.routes import auth, categories, transactions, budgets

router = APIRouter()

router.include_router(auth.router,         prefix="/auth",         tags=["Auth"])
router.include_router(categories.router,   prefix="/categories",   tags=["Categories"])
router.include_router(transactions.router, prefix="/transactions",  tags=["Transactions"])
router.include_router(budgets.router,      prefix="/budgets",       tags=["Budgets"])