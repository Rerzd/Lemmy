import { Link } from 'react-router-dom'
import { Lock, Shuffle } from 'lucide-react'
import type { LivingCostCategory } from '../../types/api'
import { COST_KIND } from '../../lib/reports'
import { formatMoney } from '../../lib/money'
import { CategoryIcon } from '../ui/CategoryIcon'

interface CostGroupProps {
  kind: 'fixed' | 'variable'
  rows: LivingCostCategory[]
  currency: string
}

// One group of this month's costs. Each group has a single bar hue, and its
// heading and icon say which group it is, so color is never the only cue.
export function CostGroup({ kind, rows, currency }: CostGroupProps) {
  const { label, tone } = COST_KIND[kind]
  const Icon = kind === 'fixed' ? Lock : Shuffle
  const items = rows.filter((r) => r.is_fixed === (kind === 'fixed') && r.this_month > 0).sort((a, b) => b.this_month - a.this_month)
  const total = items.reduce((sum, r) => sum + r.this_month, 0)

  return (
    <section className="rounded-surface border border-border bg-surface" aria-labelledby={`group-${kind}`}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 id={`group-${kind}`} className="flex items-center gap-2 text-lg font-semibold text-text">
          <Icon className="size-4 text-text-muted" aria-hidden />
          {label} this month
        </h2>
        <span className="font-display text-base font-semibold text-text">{formatMoney(total, currency)}</span>
      </header>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-text-muted">
          {kind === 'fixed' ? (
            <>
              No fixed costs this month.{' '}
              <Link to="/categories" className="font-medium text-primary-text hover:underline">
                Mark rent or utilities as fixed
              </Link>
              .
            </>
          ) : (
            'No variable spending this month.'
          )}
        </p>
      ) : (
        <ul className="space-y-3 px-5 py-4">
          {items.map((row) => {
            const share = total ? row.this_month / total : 0
            return (
              <li key={row.category_id}>
                <div className="flex items-center gap-3">
                  <CategoryIcon icon={row.icon} color={row.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-text">{row.name}</span>
                  <span className="text-sm font-semibold text-text">{formatMoney(row.this_month, currency)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 pl-10">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${share * 100}%` }} />
                  </div>
                  <span className="w-9 text-right text-xs text-text-muted">{(share * 100).toFixed(0)}%</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
