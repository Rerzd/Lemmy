import { useState } from 'react'
import { useNumberField } from '../../hooks/useNumberField'
import { LIMITS } from '../../lib/calculators/input'
import { amortize } from '../../lib/calculators/loan'
import { formatMoney } from '../../lib/money'
import { Button } from '../ui/Button'
import { CalculatorCard, ResultFigures, ResultsPending } from './CalculatorCard'
import { NumberField } from './NumberField'

const PREVIEW_ROWS = 12

export function LoanCalculator({ currency }: { currency: string }) {
  const amount = useNumberField('', { ...LIMITS.money, min: 1 })
  const rate = useNumberField('', LIMITS.percent)
  const months = useNumberField('12', LIMITS.months)
  const [showAll, setShowAll] = useState(false)
  const money = (n: number) => formatMoney(n, currency)

  const loan =
    amount.value !== null && rate.value !== null && months.value !== null
      ? amortize({ amount: amount.value, effectiveAnnualRate: rate.value, months: months.value }, currency)
      : null
  const rows = loan ? (showAll ? loan.rows : loan.rows.slice(0, PREVIEW_ROWS)) : []

  return (
    <CalculatorCard
      title="Loan payment"
      explanation="fixed monthly payment (French amortization) = amount × i ÷ (1 − (1 + i)^−months), where the effective annual rate becomes a monthly one with i = (1 + EA)^(1/12) − 1 (24% EA is 1.81% a month, not 2%). At 0% it's amount ÷ months."
      inputs={
        <div className="space-y-4">
          <NumberField label="Loan amount" field={amount} prefix={currency} placeholder="e.g. 10000000" />
          <NumberField label="Effective annual rate (EA)" field={rate} suffix="%" placeholder="e.g. 24" />
          <NumberField label="Term in months" field={months} integer hint="Up to 600 months." />
        </div>
      }
      results={
        loan ? (
          <ResultFigures
            main={{ label: 'Monthly payment', value: money(loan.payment), note: `Monthly rate ${(loan.monthlyRate * 100).toFixed(4)}%` }}
            rows={[
              { label: 'Total interest', value: money(loan.totalInterest) },
              { label: 'Total paid', value: money(loan.totalPaid) },
            ]}
          />
        ) : (
          <ResultsPending text="Enter the amount, the rate and the term." />
        )
      }
      footer={
        loan && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-text">
                Amortization schedule
                <span className="ml-2 font-sans font-normal text-text-muted">
                  {showAll || loan.rows.length <= PREVIEW_ROWS ? `${loan.rows.length} months` : `first ${PREVIEW_ROWS} of ${loan.rows.length}`}
                </span>
              </h3>
              {loan.rows.length > PREVIEW_ROWS && (
                <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                  {showAll ? 'Show first 12' : 'Show all'}
                </Button>
              )}
            </div>
            {/* The 12-row preview shows in full; the full schedule scrolls inside its own box. */}
            <div
              className={`overflow-auto rounded-control border border-border ${showAll ? 'max-h-[32rem]' : ''}`}
              tabIndex={0}
              role="region"
              aria-label="Amortization schedule"
            >
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-xs text-text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium">Month</th>
                    {/* Phones keep Month, Interest and Balance: the payment is the same every month and shown above. */}
                    <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Payment</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Interest</th>
                    <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Principal</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.month}>
                      <th scope="row" className="px-3 py-2 text-left font-normal text-text">{row.month}</th>
                      <td className="hidden px-3 py-2 text-right whitespace-nowrap text-text sm:table-cell">{money(row.payment)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap text-text-muted">{money(row.interest)}</td>
                      <td className="hidden px-3 py-2 text-right whitespace-nowrap text-text-muted sm:table-cell">{money(row.principal)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap text-text">{money(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-muted">
              The payment and each month's interest are rounded to the currency; the last payment absorbs the rounding so the balance ends at exactly 0.
            </p>
          </div>
        )
      }
    />
  )
}
