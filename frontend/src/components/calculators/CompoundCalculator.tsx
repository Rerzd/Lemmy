import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartColors, usePrefersReducedMotion } from '../../hooks/useTheme'
import { useNumberField } from '../../hooks/useNumberField'
import { growCompound } from '../../lib/calculators/compound'
import { LIMITS } from '../../lib/calculators/input'
import { formatMoney } from '../../lib/money'
import { CalculatorCard, ResultFigures, ResultsPending } from './CalculatorCard'
import { NumberField } from './NumberField'

export function CompoundCalculator({ currency }: { currency: string }) {
  const initial = useNumberField('', { ...LIMITS.money, emptyValue: 0 })
  const monthly = useNumberField('', { ...LIMITS.money, emptyValue: 0 })
  const rate = useNumberField('', LIMITS.percent)
  const years = useNumberField('10', LIMITS.years)
  const colors = useChartColors()
  const reducedMotion = usePrefersReducedMotion()
  const money = (n: number) => formatMoney(n, currency)

  const ready = initial.value !== null && monthly.value !== null && rate.value !== null && years.value !== null
  const result =
    ready && (initial.value! > 0 || monthly.value! > 0)
      ? growCompound({ initial: initial.value!, monthly: monthly.value!, yearlyRate: rate.value!, years: years.value! }, currency)
      : null

  return (
    <CalculatorCard
      title="Compound interest"
      explanation="the yearly rate is an effective annual rate (EA), turned into its monthly equivalent ((1 + rate)^(1/12) − 1); each month the balance earns that and then the deposit is added. Figures are rounded only when shown, and interest = balance − what you put in."
      inputs={
        <div className="space-y-4">
          <NumberField label="Initial amount" field={initial} prefix={currency} optional />
          <NumberField label="Monthly contribution" field={monthly} prefix={currency} optional />
          <NumberField label="Yearly interest rate" field={rate} suffix="%" placeholder="e.g. 10" hint="Effective annual rate (EA), compounded monthly." />
          <NumberField label="Years" field={years} integer hint="Up to 50 years." />
        </div>
      }
      results={
        !result ? (
          <ResultsPending text="Enter an initial amount or a monthly contribution, and a rate." />
        ) : (
          <div className="space-y-4">
            <ResultFigures
              main={{ label: `Balance after ${years.value} ${years.value === 1 ? 'year' : 'years'}`, value: money(result.finalBalance) }}
              rows={[
                { label: 'You put in', value: money(result.totalContributed) },
                { label: 'Interest earned', value: money(result.interestEarned) },
              ]}
            />
            {/* One series, so no legend box is needed; the table below is the accessible view. */}
            <div className="h-36" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.years} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={colors.grid} />
                  <XAxis dataKey="year" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis width={48} tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })} tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: colors.cursor, fillOpacity: 0.6 }} content={() => null} />
                  <Bar dataKey="balance" fill={colors.income} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={!reducedMotion} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      }
      footer={
        result && (
          <div className="max-h-72 overflow-auto rounded-control border border-border" tabIndex={0} role="region" aria-label="Balance by year">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-xs text-text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Year</th>
                  {/* Phones keep Year, Interest and Balance; "Put in" is in the figures above. */}
                  <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Put in</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Interest</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.years.map((row) => (
                  <tr key={row.year}>
                    <th scope="row" className="px-3 py-2 text-left font-normal text-text">{row.year}</th>
                    <td className="hidden px-3 py-2 text-right whitespace-nowrap text-text-muted sm:table-cell">{money(row.contributed)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap text-text-muted">{money(row.interest)}</td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap text-text">{money(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    />
  )
}
