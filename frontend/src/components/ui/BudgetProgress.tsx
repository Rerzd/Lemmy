import type { BudgetHealth } from '../../types/api'
import { BUDGET_STATUS } from '../../lib/budgetStatus'

interface BudgetProgressProps {
  pct: number
  status: BudgetHealth
  // Share of the month already elapsed (0..1): a tick marks where an even pace would be.
  pace?: number
}

export function BudgetProgress({ pct, status, pace }: BudgetProgressProps) {
  return (
    <div className="relative py-1">
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${BUDGET_STATUS[status].bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {pace !== undefined && pace > 0 && pace < 1 && (
        <span
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-text ring-2 ring-surface"
          style={{ left: `${pace * 100}%` }}
          aria-hidden
        />
      )}
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
