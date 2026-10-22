# Lemmy

[![CI](https://github.com/Rerzd/Lemmy/actions/workflows/ci.yml/badge.svg)](https://github.com/Rerzd/Lemmy/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**A personal finance tracker that tells you where your money went this month, and whether you're still on budget.**

Lemmy records income and expenses by category, sets monthly budgets per category, and turns them into a dashboard: month-over-month KPIs, a six-month income vs expenses trend, spending by category and budget health. It's a full-stack project built to be easy to run: one command starts the API and the web app against a local SQLite file, already seeded with six months of realistic demo data.

![Dashboard](docs/screenshots/dashboard.png)

## Features

- **Dashboard**: opens with one sentence about the month ("You have $ 589.700 left in your budgets, 11 days to go") and the figures behind it; spending by category as a ranked list with bars and budget status; recent transactions; a six-month income vs expenses chart.
- **Transactions**: grouped by day, with the month's money in and out; filter by type, category and description search (debounced), all kept in the URL; server-side pagination; add, edit and delete with the backend's validation messages shown in the form.
- **Categories**: income and expense side by side, each with this month's total, transaction count and a bar; 10 colors and 14 icons; 11 sensible defaults created on sign-up.
- **Reports**: what it costs to live each month, opening with a sentence ("Living costs about $4,6 M a month. $2 M is fixed.") and how long savings would last; fixed and variable costs as two lists; this month vs the usual month per category; spending by month; CSV export of the month's transactions.
- **Budgets**: monthly limit per expense category with spent, remaining, percent used and a status (on track, close to limit, over budget) shown with an icon and a label, never color alone. In the current month a tick on each bar marks an even pace, so it's clear which budgets are running ahead.
- **Month navigation**: the selected month lives in `?month=YYYY-MM`, so every view can be bookmarked and shared.
- **Light and dark themes**: follows the system by default, remembers a manual choice, and applies it before the first paint. Every text color meets WCAG AA in both themes (checked by a test).
- **Responsive**: sidebar on desktop, bottom navigation on phones, and touch targets of at least 44 px on small screens.
- **Demo account**: `demo@lemmy.app` / `demo1234`, one click from the login page.

## Tech stack

| Layer | Tools |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, JWT (python-jose) with bcrypt password hashing |
| Database | SQLite (single file, foreign keys enforced) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 with design tokens, React Router 7, Recharts, lucide-react icons, sonner toasts, axios, self-hosted Bricolage Grotesque and Instrument Sans |
| Tests | pytest + httpx (API), Vitest + Testing Library (frontend) |
| Tooling | npm scripts with `concurrently`, ESLint, optional Docker Compose |

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        SPA["React SPA<br/>pages, hooks, typed API client"]
    end

    subgraph API["FastAPI (/api/v1)"]
        Routes["Routes<br/>auth, categories, transactions,<br/>budgets, summary"]
        Services["Services<br/>business rules"]
        Repos["Repositories<br/>SQLAlchemy queries"]
        Routes --> Services --> Repos
    end

    DB[("SQLite<br/>backend/data/lemmy.db")]

    SPA -- "JSON over HTTP<br/>Bearer JWT" --> Routes
    Repos --> DB
    Alembic["Alembic baseline migration"] -. creates schema .-> DB
```

The backend is layered so each piece has one job:

- **Routes** parse and validate the request (Pydantic schemas) and pick the current user from the JWT.
- **Services** hold the business rules: type and category must match, a category can't be deleted while it's in use, budgets only on expense categories, and so on.
- **Repositories** are the only code that talks to SQLAlchemy. Summary queries aggregate in SQL (`SUM`, `COUNT`, `GROUP BY` over half-open date ranges) instead of loading rows into Python.

The frontend keeps the same separation: `api/` holds one typed module per resource, `hooks/` holds data fetching and URL state, and `pages/` composes small components from `components/`.

### Data model

```mermaid
erDiagram
    USERS ||--o{ CATEGORIES : owns
    USERS ||--o{ TRANSACTIONS : records
    USERS ||--o{ BUDGETS : sets
    CATEGORIES ||--o{ TRANSACTIONS : classifies
    CATEGORIES ||--o{ BUDGETS : limits

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string currency "COP, USD, EUR or MXN"
        datetime created_at
    }
    CATEGORIES {
        int id PK
        int user_id FK
        string name
        string type "income or expense"
        string color "hex, e.g. #f97316"
        string icon "one of 14 keys"
        bool is_fixed "fixed monthly cost, expenses only"
    }
    TRANSACTIONS {
        int id PK
        int user_id FK
        int category_id FK
        float amount "greater than 0"
        string currency
        string type "income or expense"
        string description
        date date
        datetime created_at
    }
    BUDGETS {
        int id PK
        int user_id FK
        int category_id FK
        float amount "greater than 0"
        string currency
        int month
        int year
    }
```

Budgets are unique per `(user_id, category_id, month, year)`, and transactions have an index on `(user_id, date)` for the monthly queries.

## Quickstart

You need **Python 3.12+** and **Node.js 22+**.

```bash
git clone https://github.com/Rerzd/Lemmy.git
cd Lemmy

npm run setup    # creates backend/.venv, installs both apps, creates the database and seeds the demo user
npm run dev      # API on http://localhost:8000, web app on http://localhost:5173
```

There's no virtualenv to activate: the npm scripts run Python through `scripts/py.mjs`, which uses `backend/.venv` when it exists and falls back to `python3` / `python` otherwise. Set `LEMMY_PYTHON` to use a specific interpreter.

Open http://localhost:5173 and click **Try the demo account**. Interactive API docs are at http://localhost:8000/docs.

No `.env` is needed: every setting has a working development default. To change one, copy `backend/.env.example` to `backend/.env` (or `frontend/.env.example` to `frontend/.env` for the API URL).

| Script | What it does |
|---|---|
| `npm run setup` | Create `backend/.venv` if needed, install root, frontend and backend dependencies, migrate and seed |
| `npm run dev` | Run API and web app together, with reload |
| `npm run db:migrate` | `alembic upgrade head` |
| `npm run db:seed` | Create or reset the demo user and its data |
| `npm run db:reset` | Delete the database file, migrate and seed again |
| `npm test` | Backend tests, then frontend tests |

### With Docker (optional)

```bash
docker compose up --build
docker compose exec backend python -m app.scripts.seed_demo   # optional demo data
```

The app is served on http://localhost:8080 and the API on http://localhost:8000. The backend image runs as a non-root user and applies migrations on start; the database lives in the `lemmy-data` volume. Set `SECRET_KEY` in your shell before running it anywhere but your own machine.

## API overview

All endpoints are under `/api/v1`. Everything except register and login needs an `Authorization: Bearer <token>` header, and every query is scoped to the current user.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create an account (also creates the 11 default categories) |
| POST | `/auth/login` | Form fields `username` (email) and `password`; returns a JWT valid for 24 h |
| GET | `/auth/me` | Current user |
| GET, POST | `/categories` | List or create categories |
| GET, PUT, DELETE | `/categories/{id}` | Read, update or delete a category |
| GET | `/transactions` | Filters: `month`, `year`, `type`, `category_id`, `q`, `date_from`, `date_to`; paging with `limit` (max 500) and `offset`. The total is in the `X-Total-Count` header |
| POST | `/transactions` | Create a transaction |
| GET, PUT, DELETE | `/transactions/{id}` | Read, update or delete a transaction |
| GET, POST | `/budgets` | List budgets (optionally filtered by `month` and `year`) or create one |
| GET | `/budgets/status` | Each budget for a month with spent, remaining, percent used and status |
| GET, PUT, DELETE | `/budgets/{id}` | Read, update the amount of, or delete a budget |
| GET | `/summary/overview` | Income, expenses, net, savings rate and change vs the previous month |
| GET | `/summary/by-category` | Totals and share per category for a month (`type`, default `expense`) |
| GET | `/summary/trend` | Income, expenses and net for the last `months` months (1 to 24, default 6), including empty months |
| GET | `/reports/living-costs` | `month=YYYY-MM`: this month's expenses split into fixed and variable, the usual month (average of up to 3 complete months before it, with `months_used`), income needed to cover it, savings and how many months they cover |
| GET | `/reports/category-spending` | `from` / `to` as `YYYY-MM` (up to 24 months, default the last 6): expenses per category per month, zero-filled |
| GET | `/reports/export.csv` | `month=YYYY-MM`: that month's transactions as CSV (date, description, category, type, amount) |

`month` and `year` default to the current month on the `/summary/*` endpoints and `/budgets/status`.

## Business rules

The API enforces these, and the frontend shows its messages as they come back:

- **Amounts are positive.** Whether money comes in or goes out is the transaction's `type`, never the sign. Zero or negative amounts are a `422`.
- **Type must match the category.** An expense can't be filed under an income category (`422`).
- **One currency per account.** Transactions and budgets use the account's currency; sending a different one is a `422` ("Multi-currency is not supported yet").
- **Budgets only on expense categories**, and only one per category per month (`409` on a duplicate).
- **No cascading deletes.** A category with transactions or budgets can't be deleted; the `409` says how many it has. Changing the type of a category that has transactions is also a `409`.
- **Budget status:** under 80 % used is *on track*, 80 to 100 % is *close to limit*, over 100 % is *over budget*.
- **Percent changes** compare against the previous month and divide by its absolute value, so a net going from -100 to -50 counts as an improvement. When the previous value is zero the change is `null` rather than infinity.
- **Savings rate** is net divided by income, and `null` in a month without income.
- **Fixed costs:** only expense categories can be marked as a fixed monthly cost (`422` otherwise). New accounts start with Housing and Utilities marked as fixed.
- **Living-costs baseline:** the average of up to 3 complete months before the report month. A month counts once it's over and on or after the user's first transaction, so a new account isn't averaged against empty months; `months_used` says how many were averaged. With no history the baseline, income needed and cushion are `null`, not `0`.
- **Cushion:** all-time income minus all-time expenses (never below 0), divided by the monthly baseline; `null` when the baseline is `0`.
- **CSV export:** fields with commas, quotes or newlines are quoted (RFC 4180); text cells starting with `=`, `+`, `-`, `@`, tab or carriage return get a leading `'` so spreadsheets don't run them as formulas. The file starts with a UTF-8 BOM so Excel reads accents correctly.

## Local database

Lemmy uses a single SQLite file on purpose: there's no database server to install, and the whole state is one file you can delete.

- **Location:** `backend/data/lemmy.db`, created on the first migration. The `backend/data/` folder is ignored by git. The path is resolved relative to `backend/`, so it's the same file whichever directory you start the API from.
- **Schema:** Alembic migrations in `backend/alembic/versions/`: `0001_baseline.py` creates the tables and `0002_category_is_fixed.py` adds the fixed-cost flag. Migrations run in batch mode so `ALTER`s also work on SQLite.
- **Integrity:** every connection runs `PRAGMA foreign_keys=ON`, so foreign keys are actually enforced.
- **Reset:** `npm run db:reset` deletes the file and rebuilds it with fresh demo data. The demo data is generated relative to today, so the dashboard always has the last six months filled in.
- **Inspect:** `sqlite3 backend/data/lemmy.db ".tables"`, or open the file in any SQLite browser.

`DATABASE_URL` can point elsewhere, but SQLite is the only database this project is tested against.

## Testing

| Suite | Tests | Covers |
|---|---|---|
| Backend (pytest + httpx) | **53** | Auth, business rules (amounts, type/category match, currency, budget uniqueness, protected deletes, fixed costs), living-costs and category-spending reports (no history, partial history, fixed vs variable, cushion edge cases), CSV escaping and formula injection, transaction filters and pagination, default categories, summary math, the demo seed |
| Frontend (Vitest + Testing Library) | **131** | Month math, the `?month` URL param and day labels, the dashboard and report sentences, money formatting, API error messages, the theme logic, WCAG contrast of every design token in both themes, palette and status helpers, progress bar, pagination and segmented control |

```bash
npm test             # both suites
npm run test:api     # backend only (in-memory SQLite, no setup needed)
npm run test:web     # frontend only
```

`npm --prefix frontend run lint` and `npm --prefix frontend run build` should also pass cleanly.

## Project structure

```
.
├── backend/
│   ├── alembic/versions/       # 0001 baseline, 0002 fixed-cost flag
│   ├── app/
│   │   ├── api/v1/routes/      # auth, categories, transactions, budgets, summary, reports
│   │   ├── core/               # settings, database engine, security, default categories
│   │   ├── models/             # SQLAlchemy models
│   │   ├── repositories/       # all database queries
│   │   ├── schemas/            # Pydantic request and response models
│   │   ├── services/           # business rules
│   │   ├── scripts/seed_demo.py
│   │   └── main.py
│   ├── tests/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                # typed client, one module per resource
│   │   ├── components/         # ui/, layout/, dashboard/, transactions/, categories/, budgets/, reports/
│   │   ├── context/            # auth provider
│   │   ├── hooks/              # useAsync, useMonth, useAuth, useTheme
│   │   ├── lib/                # money, dates, errors, colors, status, headline and report helpers
│   │   ├── pages/              # Dashboard, Transactions, Categories, Budgets, Reports, Auth
│   │   └── types/api.ts        # mirrors the backend schemas
│   ├── Dockerfile
│   └── nginx.conf
├── docs/screenshots/
├── scripts/py.mjs              # finds backend/.venv or python3 for the npm scripts
├── docker-compose.yml
└── package.json                # one-command scripts for the whole project
```

## Screenshots

![Reports](docs/screenshots/reports.png)

| | |
|---|---|
| ![Transactions](docs/screenshots/transactions.png) | ![Budgets](docs/screenshots/budgets.png) |
| Transactions grouped by day | Budgets with an even-pace marker |
| ![Categories](docs/screenshots/categories.png) | ![Add transaction](docs/screenshots/transaction-modal.png) |
| Categories with this month's activity | Adding a transaction |
| ![Dashboard in the dark theme](docs/screenshots/dashboard-dark.png) | <img src="docs/screenshots/dashboard-mobile.png" alt="Dashboard on a phone" width="220"> |
| Dark theme | Dashboard on a 375 px phone |
| ![Login](docs/screenshots/login.png) | |
| Login with one-click demo access | |

## Roadmap

- **Forecasting:** project next month's spending per category from history (for example with Prophet).
- **Multi-currency:** per-transaction currencies with exchange rates, instead of one currency per account.
- **Exact amounts:** store money as `Numeric` instead of `Float` to rule out rounding drift.
- **Recurring transactions:** rent, salary and subscriptions created automatically each month.
- **CSV import:** bring in bank statements and map their columns to categories.

## License

[MIT](LICENSE) © 2026 José Daniel Pulido Reyes
