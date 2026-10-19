"""Creates (or resets) the demo account with ~6 months of realistic data.

Usage, from backend/ with the venv active:
    python -m app.scripts.seed_demo

A fixed random seed makes the data reproducible (handy for screenshots);
dates are relative to today, so the demo always looks current.
"""
import calendar
import random
from datetime import date

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Budget, Category, Transaction, User
from app.repositories import user_repository
from app.services import auth_service
from app.utils.dates import shift_month

DEMO_EMAIL = "demo@lemmy.app"
DEMO_PASSWORD = "demo1234"
DEMO_NAME = "Demo User"
MONTHS = 6
SEED = 42

# (description, min, max) in COP. Amounts get rounded to the nearest 100.
FOOD = [
    ("Mercado D1", 45_000, 160_000),
    ("Almuerzo corrientazo", 14_000, 22_000),
    ("Rappi - hamburguesa", 32_000, 58_000),
    ("Éxito - mercado", 120_000, 280_000),
    ("Panadería", 6_000, 18_000),
    ("Juan Valdez", 9_000, 22_000),
    ("Frutas en la plaza", 15_000, 40_000),
]
TRANSPORT = [
    ("TransMilenio recarga", 20_000, 50_000),
    ("Uber", 12_000, 38_000),
    ("DiDi", 9_000, 28_000),
    ("Gasolina", 60_000, 140_000),
    ("Parqueadero", 5_000, 15_000),
]
ENTERTAINMENT = [
    ("Cine Colombia", 24_000, 48_000),
    ("Concierto", 90_000, 220_000),
    ("Bolos con amigos", 40_000, 80_000),
    ("Partido en El Campín", 60_000, 150_000),
]
SHOPPING = [
    ("Falabella - ropa", 90_000, 260_000),
    ("Mercado Libre", 40_000, 180_000),
    ("Homecenter", 50_000, 210_000),
]
HEALTH = [
    ("Droguería", 18_000, 70_000),
    ("Cita odontología", 80_000, 150_000),
]


def _amount(rng: random.Random, low: int, high: int) -> float:
    return float(round(rng.randint(low, high), -2))


def _reset_user(db: Session) -> User:
    # Children first: there are no cascades, on purpose.
    existing = user_repository.get_by_email(db, DEMO_EMAIL)
    if existing:
        for model in (Transaction, Budget, Category):
            db.query(model).filter(model.user_id == existing.id).delete()
        db.delete(existing)
        db.commit()
    return auth_service.register(db, DEMO_NAME, DEMO_EMAIL, DEMO_PASSWORD, "COP")


def _build_transactions(rng: random.Random, user: User, categories: dict[str, Category], today: date):
    rows: list[Transaction] = []

    def add(category: str, amount: float, day: date, description: str) -> None:
        cat = categories[category]
        rows.append(
            Transaction(
                user_id=user.id,
                category_id=cat.id,
                amount=amount,
                currency=user.currency,
                type=cat.type,
                description=description,
                date=day,
            )
        )

    # Two freelance jobs somewhere in the window.
    freelance_months = set(rng.sample(range(1, MONTHS), 2))

    for offset in range(MONTHS - 1, -1, -1):
        year, month = shift_month(today.year, today.month, -offset)
        last_day = calendar.monthrange(year, month)[1]
        # The current month only has data up to today.
        max_day = today.day if offset == 0 else last_day

        def day(n: int) -> date:
            return date(year, month, min(n, max_day))

        def random_day() -> date:
            return date(year, month, rng.randint(1, max_day))

        def happened(n: int) -> bool:
            return n <= max_day

        # Salary paid in two halves ("quincenas"), as is common in Colombia.
        if happened(15):
            add("Salary", 2_600_000, day(15), "Salario - primera quincena")
        if happened(last_day):
            add("Salary", 2_600_000, day(last_day), "Salario - segunda quincena")
        if offset in freelance_months:
            add("Freelance", _amount(rng, 900_000, 1_600_000), random_day(), "Proyecto freelance - sitio web")
        if offset == 3:
            add("Other income", 180_000, random_day(), "Venta de bicicleta usada")

        # Fixed monthly bills.
        if happened(5):
            add("Housing", 1_650_000, day(5), "Arriendo apartamento")
            add("Education", 79_000, day(5), "Suscripción Platzi")
        if happened(12):
            add("Utilities", _amount(rng, 140_000, 210_000), day(12), "Enel - energía")
            add("Utilities", 89_900, day(12), "Internet Claro")
        if happened(18):
            add("Utilities", _amount(rng, 60_000, 95_000), day(18), "Acueducto - agua")
            add("Entertainment", 26_900, day(18), "Netflix")

        # Frequent spending, scaled to the days elapsed so the current month looks partial.
        scale = max_day / last_day
        for pool, category, count in (
            (FOOD, "Food & dining", rng.randint(18, 24)),
            (TRANSPORT, "Transport", rng.randint(12, 16)),
        ):
            for _ in range(max(3, round(count * scale))):
                description, low, high = rng.choice(pool)
                add(category, _amount(rng, low, high), random_day(), description)

        # Occasional spending.
        for _ in range(rng.randint(1, 3)):
            description, low, high = rng.choice(ENTERTAINMENT)
            add("Entertainment", _amount(rng, low, high), random_day(), description)
        for _ in range(rng.randint(0, 2)):
            description, low, high = rng.choice(SHOPPING)
            add("Shopping", _amount(rng, low, high), random_day(), description)
        if rng.random() < 0.5:
            description, low, high = rng.choice(HEALTH)
            add("Health", _amount(rng, low, high), random_day(), description)

    return rows


def _build_budgets(user: User, categories: dict[str, Category], rows: list[Transaction], today: date):
    spent: dict[str, float] = {}
    for tx in rows:
        if tx.type == "expense" and (tx.date.year, tx.date.month) == (today.year, today.month):
            name = next(name for name, cat in categories.items() if cat.id == tx.category_id)
            spent[name] = spent.get(name, 0) + tx.amount

    def budget(name: str, amount: float) -> Budget:
        return Budget(
            user_id=user.id,
            category_id=categories[name].id,
            amount=float(round(amount, -4)) or 10_000.0,
            currency=user.currency,
            month=today.month,
            year=today.year,
        )

    # Sized from what was actually spent so the demo always shows every status:
    # Food ~90 % (warning), Transport ~125 % (over), the rest comfortably ok.
    return [
        budget("Food & dining", spent.get("Food & dining", 0) / 0.9),
        budget("Transport", spent.get("Transport", 0) / 1.25),
        budget("Housing", 1_800_000),
        budget("Utilities", 450_000),
        budget("Entertainment", 300_000),
        budget("Shopping", 400_000),
    ]


def seed(db: Session, today: date | None = None) -> User:
    today = today or date.today()
    rng = random.Random(SEED)

    user = _reset_user(db)
    categories = {c.name: c for c in db.query(Category).filter(Category.user_id == user.id)}

    transactions = _build_transactions(rng, user, categories, today)
    budgets = _build_budgets(user, categories, transactions, today)
    # Bulk insert in one commit; the data is generated to satisfy the business
    # rules (positive amounts, type matching the category, the user's currency).
    db.add_all(transactions + budgets)
    db.commit()
    return user


def main() -> None:
    db = SessionLocal()
    try:
        user = seed(db)
        count = db.query(Transaction).filter(Transaction.user_id == user.id).count()
        print(f"Demo user ready: {DEMO_EMAIL} / {DEMO_PASSWORD} ({count} transactions)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
