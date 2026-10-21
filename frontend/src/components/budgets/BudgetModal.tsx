import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { createBudget, updateBudget } from '../../api/budgets'
import type { BudgetStatus, Category } from '../../types/api'
import { monthLabel, type YearMonth } from '../../lib/dates'
import { getErrorMessage } from '../../lib/errors'
import { formatMoney } from '../../lib/money'
import { inputClass, labelClass } from '../../lib/ui'
import { Button } from '../ui/Button'
import { CategoryIcon } from '../ui/CategoryIcon'
import { Modal } from '../ui/Modal'

interface BudgetModalProps {
  // null = create a new one; otherwise only the amount can change.
  budget: BudgetStatus | null
  // Expense categories that don't have a budget in this month yet.
  available: Category[]
  period: YearMonth
  currency: string
  onClose: () => void
  onSaved: (created: boolean) => void
}

// Mounted only while open, so the form state always starts from the props.
export function BudgetModal({ budget, available, period, currency, onClose, onSaved }: BudgetModalProps) {
  const formId = useId()
  const isEdit = budget !== null

  const [categoryId, setCategoryId] = useState<number | ''>(available[0]?.id ?? '')
  const [amount, setAmount] = useState(budget ? String(budget.budgeted) : '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const blocked = !isEdit && available.length === 0

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!(value > 0)) return setError('Amount must be greater than zero.')
    if (!isEdit && categoryId === '') return setError('Pick a category.')

    setError(null)
    setSaving(true)
    try {
      if (isEdit) await updateBudget(budget.budget_id, value)
      else await createBudget({ category_id: Number(categoryId), amount: value, month: period.month, year: period.year })
      onSaved(!isEdit)
    } catch (err) {
      // 409 if a budget for that category and month already exists, 422 for non-expense categories.
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={isEdit ? 'Edit budget' : `New budget for ${monthLabel(period)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving} disabled={blocked}>
            {isEdit ? 'Save changes' : 'Add budget'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4" noValidate>
        {isEdit ? (
          <div className="flex items-center gap-3 rounded-control border border-border bg-bg px-3 py-2.5">
            <CategoryIcon icon={budget.icon} color={budget.color} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">{budget.name}</p>
              <p className="text-xs text-text-muted tabular-nums">
                {monthLabel(period)} · {formatMoney(budget.spent, currency)} spent so far
              </p>
            </div>
          </div>
        ) : blocked ? (
          <p className="rounded-control border border-dashed border-border-strong px-3 py-3 text-sm text-text-muted">
            Every expense category already has a budget for {monthLabel(period)}. Edit an existing one, or{' '}
            <Link to="/categories" className="font-medium text-primary-text hover:underline">
              create a new category
            </Link>
            .
          </p>
        ) : (
          <div>
            <label htmlFor={`${formId}-category`} className={labelClass}>
              Category
            </label>
            <select
              id={`${formId}-category`}
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className={inputClass}
            >
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-text-muted">Only expense categories without a budget this month are listed.</p>
          </div>
        )}

        {!blocked && (
          <div>
            <label htmlFor={`${formId}-amount`} className={labelClass}>
              Monthly limit ({currency})
            </label>
            <input
              id={`${formId}-amount`}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={`${inputClass} tabular-nums`}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-control border border-status-over/30 bg-status-over/10 px-3 py-2.5 text-sm text-status-over">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
