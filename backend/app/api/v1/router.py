from fastapi import APIRouter
from app.api.v1.routes import auth, categories, transactions, budgets, summary, reports, external

router = APIRouter()

router.include_router(auth.router,         prefix="/auth",         tags=["Auth"])
router.include_router(categories.router,   prefix="/categories",   tags=["Categories"])
router.include_router(transactions.router, prefix="/transactions",  tags=["Transactions"])
router.include_router(budgets.router,      prefix="/budgets",       tags=["Budgets"])
router.include_router(summary.router,      prefix="/summary",       tags=["Summary"])
router.include_router(reports.router,      prefix="/reports",       tags=["Reports"])
router.include_router(external.router,     prefix="/external",      tags=["External data"])
