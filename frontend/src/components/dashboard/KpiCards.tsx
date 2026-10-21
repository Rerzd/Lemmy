import { ArrowDownLeft, ArrowUpRight, PiggyBank, Scale, type LucideIcon } from 'lucide-react'
import type { Overview } from '../../types/api'
import { formatMoney } from '../../lib/money'
import { ChangeBadge } from '../ui/ChangeBadge'
import { Skeleton } from '../ui/Skeleton'

interface KpiProps {
  label: string
  value: string
  icon: LucideIcon
  tone: string
  change: React.ReactNode
}

function Kpi({ label, value, icon: Icon, tone, change }: KpiProps) {
  return (
    <div className="rounded-surface border border-border bg-surface p-3.5 shadow-raised sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{label}</p>
        <Icon className={`size-4 ${tone}`} aria-hidden />
      </div>
      <p className="mt-2 truncate font-display text-lg font-semibold text-text sm:text-2xl" title={value}>
        {value}
      </p>
      <div className="mt-1.5 flex items-center gap-1.5">
        {change}
        <span className="hidden text-xs text-text-muted sm:inline">vs last month</span>
      </div>
    </div>
  )
}

export function KpiCards({ overview, currency }: { overview: Overview | null; currency: string }) {
  if (!overview) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-surface border border-border bg-surface p-4 sm:p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-7 w-32" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
    )
  }

  const { income, expense, net, savings_rate, previous, change_pct } = overview
  const prevRate = previous.income ? previous.net / previous.income : null
  // Savings rate already is a percentage, so its change is shown in percentage points.
  const rateChange = savings_rate !== null && prevRate !== null ? (savings_rate - prevRate) * 100 : null

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Kpi
        label="Income"
        value={formatMoney(income, currency)}
        icon={ArrowDownLeft}
        tone="text-income"
        change={<ChangeBadge value={change_pct.income} />}
      />
      <Kpi
        label="Expenses"
        value={formatMoney(expense, currency)}
        icon={ArrowUpRight}
        tone="text-expense"
        change={<ChangeBadge value={change_pct.expense} upIsGood={false} />}
      />
      <Kpi
        label="Net"
        value={formatMoney(net, currency)}
        icon={Scale}
        tone="text-text-muted"
        change={<ChangeBadge value={change_pct.net} />}
      />
      <Kpi
        label="Savings rate"
        value={savings_rate === null ? 'n/a' : `${(savings_rate * 100).toFixed(1)}%`}
        icon={PiggyBank}
        tone="text-accent"
        change={<ChangeBadge value={rateChange} suffix=" pp" />}
      />
    </div>
  )
}
