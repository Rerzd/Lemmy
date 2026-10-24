import { useState } from 'react'
import { toast } from 'sonner'
import { CircleAlert, CircleCheck, Info, Scale } from 'lucide-react'
import { getLivingCosts } from '../../api/reports'
import { getOverview } from '../../api/summary'
import { LIMITS } from '../../lib/calculators/input'
import { compareWithRule, splitIncome, type MonthData } from '../../lib/calculators/rule503020'
import { monthLabel, toMonthParam, type YearMonth } from '../../lib/dates'
import { getErrorMessage } from '../../lib/errors'
import { formatMoney } from '../../lib/money'
import { useNumberField } from '../../hooks/useNumberField'
import { Button } from '../ui/Button'
import { CalculatorCard, ResultFigures, ResultsPending } from './CalculatorCard'
import { NumberField } from './NumberField'

export function RuleCalculator({ currency, period }: { currency: string; period: YearMonth }) {
  const income = useNumberField('', { ...LIMITS.money, min: 1 })
  const [month, setMonth] = useState<{ period: string; data: MonthData } | null>(null)
  const [busy, setBusy] = useState(false)
  const money = (n: number) => formatMoney(n, currency)
  const key = toMonthParam(period)

  const split = income.value !== null ? splitIncome(income.value, currency) : null
  const current = month && month.period === key ? month.data : null
  const comparison = current && income.value !== null ? compareWithRule(income.value, current, currency) : null

  const compare = async () => {
    setBusy(true)
    try {
      const [living, overview] = await Promise.all([getLivingCosts(key), getOverview(period.month, period.year)])
      setMonth({
        period: key,
        data: { fixed: living.this_month.fixed, savingsRate: overview.savings_rate, hasActivity: overview.transaction_count > 0 },
      })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <CalculatorCard
      title="50/30/20 rule"
      explanation="50% of your monthly net income for needs, 30% for wants and 20% for savings. Needs and wants are rounded to the currency and savings takes the rest, so the three always add up to your income."
      inputs={<NumberField label="Monthly net income" field={income} prefix={currency} placeholder="e.g. 5000000" />}
      results={
        split ? (
          <ResultFigures
            main={{ label: 'Needs (50%)', value: money(split.needs), note: 'Rent, utilities, groceries, transport: what you must pay.' }}
            rows={[
              { label: 'Wants (30%)', value: money(split.wants) },
              { label: 'Savings (20%)', value: money(split.savings) },
            ]}
          />
        ) : (
          <ResultsPending text="Enter your monthly net income." />
        )
      }
      footer={
        <div className="space-y-3">
          <Button variant="secondary" onClick={compare} loading={busy} disabled={!split}>
            {!busy && <Scale className="size-4" aria-hidden />}
            Compare with my month
          </Button>
          <div aria-live="polite" className="space-y-2 empty:hidden">
            {comparison?.empty && (
              <p className="flex items-start gap-2 text-sm text-text-muted">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                {comparison.empty}
              </p>
            )}
            {comparison && !comparison.empty && (
              <>
                <p className="text-xs text-text-muted">{monthLabel(period)}, using fixed costs from Reports.</p>
                {[comparison.needs, comparison.savings].map(
                  (check, i) =>
                    check && (
                      <p key={i} className="flex items-start gap-2 text-sm text-text">
                        {check.ok ? (
                          <CircleCheck className="mt-0.5 size-4 shrink-0 text-status-ok" aria-label="Within the rule" />
                        ) : (
                          <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-over" aria-label="Outside the rule" />
                        )}
                        {check.text}
                      </p>
                    ),
                )}
              </>
            )}
          </div>
        </div>
      }
    />
  )
}
