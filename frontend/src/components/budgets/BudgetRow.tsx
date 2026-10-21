import { Trash2 } from 'lucide-react'
import type { BudgetStatus } from '../../types/api'
import { formatMoney } from '../../lib/money'
import { BudgetProgress, BudgetStatusLabel } from '../ui/BudgetProgress'
import { CategoryIcon } from '../ui/CategoryIcon'

interface BudgetRowProps {
  budget: BudgetStatus
  currency: string
  pace?: number
  onEdit: () => void
  onDelete: () => void
}

export function BudgetRow({ budget: b, currency, pace, onEdit, onDelete }: BudgetRowProps) {
  const over = b.remaining < 0
  return (
    <li className="flex items-start gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${b.name} budget`}
        className="min-w-0 flex-1 rounded-control px-2 py-3 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="flex items-center gap-3">
          <CategoryIcon icon={b.icon} color={b.color} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text">{b.name}</span>
            <BudgetStatusLabel status={b.status} />
          </span>
          <span className="shrink-0 text-right">
            <span className={`block font-display text-base font-semibold ${over ? 'text-status-over' : 'text-text'}`}>
              {formatMoney(Math.abs(b.remaining), currency)}
            </span>
            <span className="block text-xs text-text-muted">{over ? 'over' : 'left'}</span>
          </span>
        </span>
        <span className="mt-2 block pl-12">
          <BudgetProgress pct={b.pct_used} status={b.status} pace={pace} />
          <span className="mt-1 flex justify-between gap-3 text-xs text-text-muted">
            <span className="truncate">
              {formatMoney(b.spent, currency)} of {formatMoney(b.budgeted, currency)}
            </span>
            <span className="shrink-0">{b.pct_used.toFixed(0)}% used</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${b.name} budget`}
        className="mt-2 flex size-11 shrink-0 items-center justify-center rounded-chip text-text-muted hover:bg-surface-2 hover:text-status-over focus-visible:outline-2 focus-visible:outline-primary sm:size-9"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  )
}
