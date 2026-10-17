from typing import Literal, get_args

# The fixed set of icon keys the frontend knows how to render (lucide icon names).
# Keeping it in one place lets the schemas validate input against it.
Icon = Literal[
    "wallet",
    "briefcase",
    "coins",
    "utensils",
    "car",
    "home",
    "zap",
    "heart-pulse",
    "film",
    "shopping-bag",
    "graduation-cap",
    "gift",
    "piggy-bank",
    "tag",
]
ICONS: tuple[str, ...] = get_args(Icon)
DEFAULT_ICON = "tag"
DEFAULT_COLOR = "#64748b"

# Starter set every new account gets, so the app is usable right after sign-up.
DEFAULT_CATEGORIES: list[dict] = [
    {"name": "Salary", "type": "income", "color": "#10b981", "icon": "briefcase"},
    {"name": "Freelance", "type": "income", "color": "#14b8a6", "icon": "wallet"},
    {"name": "Other income", "type": "income", "color": "#22c55e", "icon": "coins"},
    {"name": "Food & dining", "type": "expense", "color": "#f97316", "icon": "utensils"},
    {"name": "Transport", "type": "expense", "color": "#3b82f6", "icon": "car"},
    {"name": "Housing", "type": "expense", "color": "#8b5cf6", "icon": "home"},
    {"name": "Utilities", "type": "expense", "color": "#eab308", "icon": "zap"},
    {"name": "Health", "type": "expense", "color": "#ef4444", "icon": "heart-pulse"},
    {"name": "Entertainment", "type": "expense", "color": "#ec4899", "icon": "film"},
    {"name": "Shopping", "type": "expense", "color": "#06b6d4", "icon": "shopping-bag"},
    {"name": "Education", "type": "expense", "color": "#6366f1", "icon": "graduation-cap"},
]
