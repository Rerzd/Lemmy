import type { BudgetStatus, Overview } from '../../types/api'
import { buildHeadline } from '../../lib/headline'
import { monthLabel, type YearMonth } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { ChangeBadge } from '../ui/ChangeBadge'
import { Skeleton } from '../ui/Skeleton'

interface HeadlineProps {
  period: YearMonth
  overview: Overview | null
  budgets: BudgetStatus[] | null
  currency: string
}

const EMPHASIS = { neutral: 'text-text', good: 'text-status-ok', bad: 'text-status-over' }

// The dashboard opens with a sentence, not a row of identical cards; the figures support it.
export function Headline({ period, overview, budgets, currency }: HeadlineProps) {
  if (!overview || !budgets) {
    return (
      <section className="rounded-surface border border-border bg-surface p-5 shadow-raised sm:p-7" aria-busy>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-8 w-full max-w-xl" />
        <Skeleton className="mt-2 h-8 w-2/3 max-w-md" />
        <Skeleton className="mt-6 h-12 w-full" />
      </section>
    )
  }

  const headline = buildHeadline(period, new Date(), overview, budgets, currency)
  const { income, expense, net, savings_rate, previous, change_pct } = overview
  const prevRate = previous.income ? previous.net / previous.income : null
  // Savings rate is already a percentage, so its change is shown in percentage points.
  const rateChange = savings_rate !== null && prevRate !== null ? (savings_rate - prevRate) * 100 : null

  const figures = [
    { label: 'Income', value: formatMoney(income, currency), change: <ChangeBadge value={change_pct.income} /> },
    { label: 'Spent', value: formatMoney(expense, currency), change: <ChangeBadge value={change_pct.expense} upIsGood={false} /> },
    { label: 'Net', value: formatMoney(net, currency), change: <ChangeBadge value={change_pct.net} /> },
    {
      label: 'Savings rate',
      value: savings_rate === null ? 'n/a' : `${(savings_rate * 100).toFixed(1)}%`,
      change: <ChangeBadge value={rateChange} suffix=" pp" />,
    },
  ]

  return (
    <section className="rounded-surface border border-border bg-surface shadow-raised" aria-labelledby="headline">
      <div className="p-5 sm:p-7">
        <p className="text-xs font-semibold tracking-wide text-primary-text uppercase">{monthLabel(period)}</p>
        <h2 id="headline" className="mt-2 max-w-3xl text-xl leading-snug font-semibold text-balance text-text sm:text-3xl sm:leading-tight">
          {headline.parts.map((part, i) =>
            part.emphasis ? (
              <strong key={i} className={`font-bold whitespace-nowrap ${EMPHASIS[part.emphasis]}`}>
                {part.text}
              </strong>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </h2>
        {headline.detail && <p className="mt-2 text-sm text-text-muted sm:text-base">{headline.detail}</p>}
      </div>

      <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-4 sm:divide-x sm:divide-border">
        {figures.map((f, i) => (
          <div key={f.label} className={`px-5 py-4 sm:px-7 ${i % 2 === 1 ? 'border-l border-border sm:border-l-0' : ''} ${i > 1 ? 'border-t border-border sm:border-t-0' : ''}`}>
            <dt className="text-xs text-text-muted">{f.label}</dt>
            <dd className="mt-1 truncate font-display text-base font-semibold text-text sm:text-lg" title={f.value}>
              {f.value}
            </dd>
            <dd className="mt-0.5">{f.change}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
