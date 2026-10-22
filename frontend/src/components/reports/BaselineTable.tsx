import type { LivingCosts } from '../../types/api'
import { monthLabel, parseMonthParam } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { monthsUsedNote } from '../../lib/reports'
import { ChangeBadge } from '../ui/ChangeBadge'
import { CategoryIcon } from '../ui/CategoryIcon'
import { CostKind } from './CostKind'

// This month vs the average of the last complete months, per category.
export function BaselineTable({ report, currency }: { report: LivingCosts; currency: string }) {
  const rows = report.categories.filter((r) => r.this_month > 0 || (r.baseline ?? 0) > 0)
  const note = monthsUsedNote(report.months_used)
  // "Jul to Sep 2026" (or one month on its own) instead of raw YYYY-MM values.
  const months = report.baseline_months.map(parseMonthParam).filter((m) => m !== null)
  const range =
    months.length === 0
      ? ''
      : months.length === 1
        ? monthLabel(months[0], 'compact')
        : `${monthLabel(months[0], months[0].year === months.at(-1)!.year ? 'short' : 'compact')} to ${monthLabel(months.at(-1)!, 'compact')}`
  const change = (pct: number | null, baseline: number | null, current: number) =>
    pct !== null ? (
      <ChangeBadge value={pct} upIsGood={false} />
    ) : (
      <span className="text-xs text-text-muted">{baseline === 0 && current > 0 ? 'New' : '—'}</span>
    )

  return (
    <section className="rounded-surface border border-border bg-surface" aria-labelledby="baseline-heading">
      <header className="border-b border-border px-5 py-3">
        <h2 id="baseline-heading" className="text-lg font-semibold text-text">
          This month vs your usual month
        </h2>
        <p className="text-xs text-text-muted">
          {report.months_used > 0
            ? `Usual = average of ${range}.`
            : 'The usual month appears once a full month is recorded.'}
          {note && report.months_used > 0 ? ` ${note}.` : ''}
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-text-muted">No spending to compare yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th scope="col" className="px-5 py-2.5 font-medium">Category</th>
              <th scope="col" className="px-2 py-2.5 text-right font-medium">This month</th>
              <th scope="col" className="px-2 py-2.5 text-right font-medium sm:pr-5">Usual</th>
              <th scope="col" className="hidden py-2.5 pr-5 text-right font-medium sm:table-cell">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border border-t border-border">
            {rows.map((r) => (
              <tr key={r.category_id}>
                <th scope="row" className="px-5 py-3 text-left align-top font-normal">
                  <span className="flex items-center gap-2.5">
                    {/* Phones drop the icon so the name has room to wrap instead of truncating. */}
                    <span className="hidden sm:inline-flex">
                      <CategoryIcon icon={r.icon} color={r.color} size="sm" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-text sm:truncate">{r.name}</span>
                      <CostKind fixed={r.is_fixed} />
                    </span>
                  </span>
                </th>
                <td className="px-2 py-3 text-right align-top whitespace-nowrap">
                  <span className="font-semibold text-text">{formatMoney(r.this_month, currency)}</span>
                  {/* Phones have no Change column, so the badge sits under the amount. */}
                  <span className="mt-0.5 block sm:hidden">{change(r.change_pct, r.baseline, r.this_month)}</span>
                </td>
                <td className="px-2 py-3 text-right align-top whitespace-nowrap text-text-muted sm:pr-5">
                  {r.baseline === null ? '—' : formatMoney(r.baseline, currency)}
                </td>
                <td className="hidden py-3 pr-5 text-right align-top sm:table-cell">{change(r.change_pct, r.baseline, r.this_month)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
