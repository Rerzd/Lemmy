import type { BudgetHealth } from '../../types/api'
import { BUDGET_STATUS } from '../../lib/budgetStatus'

export function BudgetProgress({ pct, status }: { pct: number; status: BudgetHealth }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${BUDGET_STATUS[status].bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

export function BudgetStatusLabel({ status }: { status: BudgetHealth }) {
  const { label, text, icon: Icon } = BUDGET_STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${text}`}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  )
}
