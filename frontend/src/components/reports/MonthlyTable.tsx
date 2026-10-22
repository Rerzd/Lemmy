import type { CategorySpending } from '../../types/api'
import { monthLabel, parseMonthParam } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { CostKind } from './CostKind'

// Spending per category for the last months. Wide on purpose: it scrolls inside
// its own box on phones while the category column stays pinned.
export function MonthlyTable({ data, currency }: { data: CategorySpending; currency: string }) {
  const rows = data.categories.filter((c) => c.total > 0)
  const heading = (m: string) => {
    const ym = parseMonthParam(m)
    return ym ? monthLabel(ym, 'short') : m
  }
  const cell = 'px-3 py-2.5 text-right whitespace-nowrap'

  return (
    <section className="rounded-surface border border-border bg-surface" aria-labelledby="monthly-heading">
      <header className="border-b border-border px-5 py-3">
        <h2 id="monthly-heading" className="text-lg font-semibold text-text">
          Spending by month
        </h2>
        <p className="text-xs text-text-muted">Expenses per category, last {data.months.length} months.</p>
      </header>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-text-muted">No spending in these months.</p>
      ) : (
        <div className="overflow-x-auto" role="region" aria-labelledby="monthly-heading" tabIndex={0}>
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-xs text-text-muted">
                <th scope="col" className="sticky left-0 bg-surface px-5 py-2.5 text-left font-medium">
                  Category
                </th>
                {data.months.map((m) => (
                  <th key={m} scope="col" className={`${cell} font-medium`}>
                    {heading(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border border-t border-border">
              {rows.map((r) => (
                <tr key={r.category_id}>
                  <th scope="row" className="sticky left-0 bg-surface px-5 py-2.5 text-left font-normal">
                    <span className="block text-text">{r.name}</span>
                    <CostKind fixed={r.is_fixed} />
                  </th>
                  {r.totals.map((v, i) => (
                    <td key={data.months[i]} className={`${cell} ${v ? 'text-text' : 'text-text-muted'}`}>
                      {v ? formatMoney(v, currency, { compact: true }) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border-strong">
              <tr className="font-semibold text-text">
                <th scope="row" className="sticky left-0 bg-surface px-5 py-2.5 text-left">
                  Total
                </th>
                {data.totals.map((v, i) => (
                  <td key={data.months[i]} className={cell}>
                    {formatMoney(v, currency, { compact: true })}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}
