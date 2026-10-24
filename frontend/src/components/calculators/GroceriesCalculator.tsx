import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Info, Scale, Target } from 'lucide-react'
import { getBudgetStatus } from '../../api/budgets'
import { getByCategory } from '../../api/summary'
import type { Category } from '../../types/api'
import { BUDGET_STATUS } from '../../lib/budgetStatus'
import { comparePlan, PLAN_STATUS } from '../../lib/calculators/compare'
import { planGroceries, type ShoppingFrequency } from '../../lib/calculators/groceries'
import { LIMITS } from '../../lib/calculators/input'
import { monthLabel, type YearMonth } from '../../lib/dates'
import { getErrorMessage } from '../../lib/errors'
import { formatMoney } from '../../lib/money'
import { inputClass, labelClass } from '../../lib/ui'
import { useNumberField } from '../../hooks/useNumberField'
import { BudgetModal } from '../budgets/BudgetModal'
import { Button } from '../ui/Button'
import { SegmentedControl } from '../ui/SegmentedControl'
import { CalculatorCard, ResultFigures, ResultsPending } from './CalculatorCard'
import { NumberField } from './NumberField'

const FREQUENCIES: { value: ShoppingFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
]

interface GroceriesCalculatorProps {
  currency: string
  period: YearMonth
  // Carries ?month along in links.
  search: string
  categories: Category[] | null
}

// What the comparison found for one category and month (the plan side stays live).
interface Spent {
  categoryId: number
  period: string
  actual: number
}

// Shown instead of opening the form when the category already has a budget that month.
interface Taken {
  categoryId: number
  period: string
  amount: number
}

export function GroceriesCalculator({ currency, period, search, categories }: GroceriesCalculatorProps) {
  const selectId = useId()
  const people = useNumberField('2', { min: 1, max: 20, integer: true })
  const [frequency, setFrequency] = useState<ShoppingFrequency>('weekly')
  const perShop = useNumberField('', LIMITS.money)
  const mealsOut = useNumberField('', { max: 42, integer: true, emptyValue: 0 })
  const mealCost = useNumberField('', { ...LIMITS.money, emptyValue: 0 })

  const expense = (categories ?? []).filter((c) => c.type === 'expense')
  const [chosen, setChosen] = useState<number | ''>('')
  // Default to a food-like category; the user can pick any expense category.
  // .at(0) is honest about an empty list (expense[0] would be typed as always present).
  const fallback = expense.find((c) => /food|grocer|aliment|comida/i.test(c.name)) ?? expense.at(0)
  const categoryId: number | '' = chosen !== '' ? chosen : (fallback?.id ?? '')
  const category = expense.find((c) => c.id === categoryId)
  const periodKey = `${period.year}-${period.month}`

  const [spent, setSpent] = useState<Spent | null>(null)
  const [taken, setTaken] = useState<Taken | null>(null)
  const [busy, setBusy] = useState<'compare' | 'budget' | null>(null)
  const [modal, setModal] = useState<{ available: Category[] } | null>(null)

  const valid = people.value !== null && perShop.value !== null && mealsOut.value !== null && mealCost.value !== null
  const plan = valid
    ? planGroceries(
        { people: people.value!, frequency, budgetPerShop: perShop.value!, mealsOutPerWeek: mealsOut.value!, mealOutCost: mealCost.value! },
        currency,
      )
    : null
  const money = (n: number) => formatMoney(n, currency)

  // Results only apply while category and month are the ones they were fetched for.
  const current = spent && spent.categoryId === categoryId && spent.period === periodKey ? spent : null
  const comparison = current && plan ? comparePlan(plan.totalMonthly, current.actual) : null
  const takenNow = taken && taken.categoryId === categoryId && taken.period === periodKey ? taken : null

  const compare = async () => {
    if (categoryId === '') return
    setBusy('compare')
    try {
      const rows = await getByCategory(period.month, period.year, 'expense')
      setSpent({ categoryId, period: periodKey, actual: rows.find((r) => r.category_id === categoryId)?.total ?? 0 })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const createBudget = async () => {
    if (categoryId === '' || !plan) return
    setBusy('budget')
    try {
      const budgets = await getBudgetStatus(period.month, period.year)
      const existing = budgets.find((b) => b.category_id === categoryId)
      if (existing) {
        setTaken({ categoryId, period: periodKey, amount: existing.budgeted })
      } else {
        setTaken(null)
        const used = new Set(budgets.map((b) => b.category_id))
        setModal({ available: expense.filter((c) => !used.has(c.id)) })
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const status = comparison ? PLAN_STATUS[comparison.status] : null
  const health = status ? BUDGET_STATUS[status.health] : null

  return (
    <>
      <CalculatorCard
        title="Groceries planner"
        explanation="budget per shop × shops per month (52 weeks ÷ 12, so weekly is 4.33 shops), plus meals out per week × their cost × 4.33. Amounts are rounded to the currency only at the end."
        inputs={
          <div className="space-y-4">
            <NumberField label="People in the household" field={people} integer />
            <div>
              <p className={labelClass} id={`${selectId}-freq`}>
                How often you shop
              </p>
              <SegmentedControl label="How often you shop" value={frequency} options={FREQUENCIES} onChange={setFrequency} className="w-full" />
            </div>
            <NumberField label="Budget per shop" field={perShop} prefix={currency} placeholder="e.g. 250000" />
            <div className="grid items-end gap-4 sm:grid-cols-2">
              <NumberField label="Meals out per week" field={mealsOut} optional integer />
              <NumberField label="Average cost per meal out" field={mealCost} prefix={currency} optional />
            </div>
          </div>
        }
        results={
          plan ? (
            <ResultFigures
              main={{ label: 'Total food cost per month', value: money(plan.totalMonthly) }}
              rows={[
                { label: 'Groceries per month', value: money(plan.groceriesMonthly) },
                { label: 'Groceries per week', value: money(plan.groceriesWeekly) },
                { label: 'Per person per month', value: money(plan.perPersonMonthly) },
                { label: 'Per day', value: money(plan.perDay) },
                { label: 'Eating out per month', value: money(plan.eatingOutMonthly) },
              ]}
            />
          ) : (
            <ResultsPending text="Enter how many people and your budget per shop to see the plan." />
          )
        }
        footer={
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="sm:w-64">
                <label htmlFor={selectId} className={labelClass}>
                  Category to check
                </label>
                <select
                  id={selectId}
                  value={categoryId}
                  onChange={(e) => setChosen(Number(e.target.value))}
                  className={inputClass}
                  disabled={!expense.length}
                >
                  {expense.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="secondary" onClick={compare} loading={busy === 'compare'} disabled={!plan || categoryId === ''}>
                {busy !== 'compare' && <Scale className="size-4" aria-hidden />}
                Compare with my spending
              </Button>
              <Button onClick={createBudget} loading={busy === 'budget'} disabled={!plan || categoryId === ''}>
                {busy !== 'budget' && <Target className="size-4" aria-hidden />}
                Create budget from this plan
              </Button>
            </div>

            <div aria-live="polite" className="space-y-2 empty:hidden">
              {current && plan && category && (
                current.actual === 0 ? (
                  <p className="flex items-start gap-2 text-sm text-text-muted">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                    No spending in {category.name} in {monthLabel(period)} yet, so there's nothing to compare.
                  </p>
                ) : (
                  comparison &&
                  status &&
                  health && (
                    <div className="rounded-control border border-border bg-bg p-3 text-sm">
                      <p className={`flex items-center gap-1.5 font-semibold ${health.text}`}>
                        <health.icon className="size-4" aria-hidden />
                        {status.label}
                      </p>
                      <p className="mt-1 text-text">
                        Spent {money(current.actual)} in {category.name} in {monthLabel(period)}, {comparison.pct.toFixed(0)}% of the{' '}
                        {money(plan.totalMonthly)} planned
                        {comparison.difference >= 0
                          ? ` (${money(comparison.difference)} left).`
                          : ` (${money(-comparison.difference)} over).`}
                      </p>
                    </div>
                  )
                )
              )}
              {takenNow && category && (
                <p className="flex items-start gap-2 text-sm text-text">
                  <Info className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
                  <span>
                    {category.name} already has a budget of {money(takenNow.amount)} for {monthLabel(period)}. Only one budget per category
                    and month is allowed;{' '}
                    <Link to={`/budgets${search}`} className="font-medium text-primary-text hover:underline">
                      change it on the Budgets page
                    </Link>
                    .
                  </span>
                </p>
              )}
            </div>
          </div>
        }
      />

      {modal && plan && (
        <BudgetModal
          budget={null}
          available={modal.available}
          period={period}
          currency={currency}
          initialCategoryId={categoryId === '' ? undefined : categoryId}
          initialAmount={plan.totalMonthly}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            toast.success('Budget created from your plan')
          }}
        />
      )}
    </>
  )
}
