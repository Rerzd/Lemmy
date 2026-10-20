import { Pencil, Trash2 } from 'lucide-react'
import type { BudgetStatus } from '../../types/api'
import { formatMoney } from '../../lib/money'
import { BudgetProgress, BudgetStatusLabel } from '../ui/BudgetProgress'
import { CategoryIcon } from '../ui/CategoryIcon'

interface BudgetCardProps {
  budget: BudgetStatus
  currency: string
  onEdit: () => void
  onDelete: () => void
}

const iconButton =
  'flex size-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-violet-500 sm:size-8'

export function BudgetCard({ budget: b, currency, onEdit, onDelete }: BudgetCardProps) {
  const over = b.remaining < 0
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={b.icon} color={b.color} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-slate-200">{b.name}</h3>
          <BudgetStatusLabel status={b.status} />
        </div>
        <div className="-mr-2 flex shrink-0 items-center sm:mr-0">
          <button type="button" onClick={onEdit} aria-label={`Edit ${b.name} budget`} className={`${iconButton} hover:text-slate-100`}>
            <Pencil className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={onDelete} aria-label={`Delete ${b.name} budget`} className={`${iconButton} hover:text-rose-400`}>
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-400 tabular-nums">
        <span className="text-xl font-semibold text-slate-100">{formatMoney(b.spent, currency)}</span> of{' '}
        {formatMoney(b.budgeted, currency)}
      </p>
      <div className="mt-2">
        <BudgetProgress pct={b.pct_used} status={b.status} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs tabular-nums">
        <span className={over ? 'font-medium text-rose-400' : 'text-slate-400'}>
          {over ? `${formatMoney(-b.remaining, currency)} over` : `${formatMoney(b.remaining, currency)} left`}
        </span>
        <span className="text-slate-500">{b.pct_used.toFixed(0)}% used</span>
      </div>
    </li>
  )
}
