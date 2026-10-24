import { useNumberField } from '../../hooks/useNumberField'
import { LIMITS } from '../../lib/calculators/input'
import { planSavingsGoal } from '../../lib/calculators/savingsGoal'
import { monthLabel } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { CalculatorCard, ResultFigures, ResultsPending } from './CalculatorCard'
import { NumberField } from './NumberField'

export function SavingsGoalCalculator({ currency }: { currency: string }) {
  const target = useNumberField('', { ...LIMITS.money, min: 1 })
  const current = useNumberField('', { ...LIMITS.money, emptyValue: 0 })
  const months = useNumberField('12', LIMITS.months)
  const yearlyReturn = useNumberField('0', { ...LIMITS.percent, emptyValue: 0 })
  const money = (n: number) => formatMoney(n, currency)

  const ready = target.value !== null && current.value !== null && months.value !== null && yearlyReturn.value !== null
  const result = ready
    ? planSavingsGoal(
        { target: target.value!, current: current.value!, months: months.value!, yearlyReturn: yearlyReturn.value! },
        new Date(),
        currency,
      )
    : null

  return (
    <CalculatorCard
      title="Savings goal"
      explanation="deposits at the end of each month, with the yearly return, an effective annual rate (EA), turned into its monthly equivalent ((1 + rate)^(1/12) − 1) and compounded. With a 0% return it's simply what's missing ÷ months."
      inputs={
        <div className="space-y-4">
          <NumberField label="Target amount" field={target} prefix={currency} placeholder="e.g. 20000000" />
          <NumberField label="Current savings" field={current} prefix={currency} optional />
          <NumberField label="Months available" field={months} integer hint="Up to 600 months (50 years)." />
          <NumberField label="Expected yearly return" field={yearlyReturn} suffix="%" optional hint="Effective annual rate. Leave 0 if you're not sure." />
        </div>
      }
      results={
        !result ? (
          <ResultsPending text="Enter a target and how many months you have." />
        ) : result.kind === 'reached' ? (
          <ResultFigures main={{ label: 'Monthly contribution needed', value: money(0), note: 'Your current savings already cover the target.' }} />
        ) : result.kind === 'growth' ? (
          <ResultFigures
            main={{
              label: 'Monthly contribution needed',
              value: money(0),
              note: `At that return your savings alone reach the target in ${result.months} ${result.months === 1 ? 'month' : 'months'}, around ${monthLabel(result.reachedOn)}.`,
            }}
          />
        ) : (
          <ResultFigures
            main={{ label: 'Monthly contribution needed', value: money(result.monthly), note: `Goal reached around ${monthLabel(result.reachedOn)} at that pace.` }}
            rows={[
              { label: 'You put in', value: money(result.totalContributed) },
              { label: 'Returns add about', value: money(result.growth) },
            ]}
          />
        )
      }
    />
  )
}
