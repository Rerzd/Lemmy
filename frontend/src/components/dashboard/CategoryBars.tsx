import { Link } from 'react-router-dom'
import type { BudgetStatus, CategoryTotal } from '../../types/api'
import { BUDGET_STATUS } from '../../lib/budgetStatus'
import { formatMoney } from '../../lib/money'
import { CategoryIcon } from '../ui/CategoryIcon'

interface CategoryBarsProps {
  rows: CategoryTotal[]
  budgets: BudgetStatus[]
  currency: string
  // Carries ?month along, so a row opens that category's transactions for the same month.
  search: string
}

interface Row {
  id: number
  name: string
  icon: string
  color: string
  total: number
  count: number
  budget?: BudgetStatus
}

// Spending per category as a ranked list. Bars share one hue: they encode amount, not identity.
export function CategoryBars({ rows, budgets, currency, search }: CategoryBarsProps) {
  const byCategory = new Map(budgets.map((b) => [b.category_id, b]))
  const list: Row[] = rows.map((r) => ({
    id: r.category_id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    total: r.total,
    count: r.count,
    budget: byCategory.get(r.category_id),
  }))
  // Budgeted categories with nothing spent yet still belong on the list.
  for (const b of budgets) {
    if (!list.some((r) => r.id === b.category_id)) {
      list.push({ id: b.category_id, name: b.name, icon: b.icon, color: b.color, total: 0, count: 0, budget: b })
    }
  }
  const total = list.reduce((sum, r) => sum + r.total, 0)

  return (
    <ul className="-mx-2 space-y-1">
      {list.map((row) => {
        const share = total ? row.total / total : 0
        const query = new URLSearchParams(search)
        query.set('category', String(row.id))
        const status = row.budget ? BUDGET_STATUS[row.budget.status] : null
        return (
          <li key={row.id}>
            <Link
              to={`/transactions?${query.toString()}`}
              className="block rounded-control px-2 py-2.5 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <div className="flex items-center gap-3">
                <CategoryIcon icon={row.icon} color={row.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{row.name}</p>
                  {row.budget && status ? (
                    <p className={`flex items-center gap-1 text-xs ${status.text}`}>
                      <status.icon className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">
                        {status.label} · {row.budget.pct_used.toFixed(0)}% of {formatMoney(row.budget.budgeted, currency, { compact: true })}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted">
                      {row.count} transaction{row.count === 1 ? '' : 's'} · no budget
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-text">{formatMoney(row.total, currency)}</span>
              </div>
              <div className="mt-2 flex items-center gap-3 pl-10">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${share * 100}%` }} />
                </div>
                <span className="w-9 text-right text-xs text-text-muted">{(share * 100).toFixed(0)}%</span>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
