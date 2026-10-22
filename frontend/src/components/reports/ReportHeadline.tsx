import { Info } from 'lucide-react'
import type { LivingCosts } from '../../types/api'
import { monthLabel, parseMonthParam } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { buildLivingCostsHeadline, monthsUsedNote } from '../../lib/reports'

// Opens the report with a sentence, then the figures behind it (same pattern as the dashboard).
export function ReportHeadline({ report, currency }: { report: LivingCosts; currency: string }) {
  const headline = buildLivingCostsHeadline(report, currency)
  const note = monthsUsedNote(report.months_used)
  const period = parseMonthParam(report.month)
  const dash = '—'
  const figures = [
    { label: 'Income needed a month', value: report.min_monthly_income === null ? dash : formatMoney(report.min_monthly_income, currency) },
    { label: 'Fixed', value: report.baseline ? formatMoney(report.baseline.fixed, currency) : dash },
    { label: 'Variable', value: report.baseline ? formatMoney(report.baseline.variable, currency) : dash },
    { label: 'Savings', value: formatMoney(report.savings, currency) },
  ]

  return (
    <section className="rounded-surface border border-border bg-surface shadow-raised" aria-labelledby="report-headline">
      <div className="p-5 sm:p-7">
        <p className="text-xs font-semibold tracking-wide text-primary-text uppercase">
          Living costs{period ? ` · ${monthLabel(period)}` : ''}
        </p>
        <h2 id="report-headline" className="mt-2 max-w-3xl text-xl leading-snug font-semibold text-balance text-text sm:text-3xl sm:leading-tight">
          {headline.parts.map((part, i) =>
            part.emphasis ? (
              <strong key={i} className="font-bold whitespace-nowrap text-primary-text">
                {part.text}
              </strong>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </h2>
        {headline.detail && <p className="mt-2 text-sm text-text-muted sm:text-base">{headline.detail}</p>}
        {note && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-chip bg-surface-2 px-2 py-1 text-xs text-text-muted">
            <Info className="size-3.5 shrink-0" aria-hidden />
            {note}
          </p>
        )}
      </div>
      <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-4 sm:divide-x sm:divide-border">
        {figures.map((f, i) => (
          <div
            key={f.label}
            className={`px-5 py-4 sm:px-7 ${i % 2 === 1 ? 'border-l border-border sm:border-l-0' : ''} ${i > 1 ? 'border-t border-border sm:border-t-0' : ''}`}
          >
            <dt className="text-xs text-text-muted">{f.label}</dt>
            <dd className="mt-1 truncate font-display text-base font-semibold text-text sm:text-lg" title={f.value}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
