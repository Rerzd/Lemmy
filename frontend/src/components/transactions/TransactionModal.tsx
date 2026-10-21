import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CircleAlert, Trash2 } from 'lucide-react'
import { createTransaction, updateTransaction } from '../../api/transactions'
import type { Category, Transaction, TxType } from '../../types/api'
import { todayISO } from '../../lib/dates'
import { getErrorMessage } from '../../lib/errors'
import { inputClass, labelClass } from '../../lib/ui'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { SegmentedControl } from '../ui/SegmentedControl'

interface TransactionModalProps {
  // null = create a new one.
  transaction: Transaction | null
  categories: Category[]
  defaultType: TxType
  currency: string
  onClose: () => void
  onSaved: (transaction: Transaction, created: boolean) => void
  onDelete: (transaction: Transaction) => void
}

const TYPE_OPTIONS: { value: TxType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

// Mounted only while open, so the form state always starts from the props.
export function TransactionModal({
  transaction,
  categories,
  defaultType,
  currency,
  onClose,
  onSaved,
  onDelete,
}: TransactionModalProps) {
  const formId = useId()
  const isEdit = transaction !== null
  const firstOf = (type: TxType) => categories.find((c) => c.type === type)?.id ?? ''

  const [type, setType] = useState<TxType>(transaction?.type ?? defaultType)
  const [categoryId, setCategoryId] = useState<number | ''>(transaction?.category_id ?? firstOf(defaultType))
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [date, setDate] = useState(transaction?.date ?? todayISO())
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const options = categories.filter((c) => c.type === type)

  const changeType = (next: TxType) => {
    setType(next)
    // The backend rejects a category of the other type, so don't keep one around.
    if (!categories.some((c) => c.id === categoryId && c.type === next)) setCategoryId(firstOf(next))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!(value > 0)) return setError('Amount must be greater than zero.')
    if (categoryId === '') return setError('Pick a category.')

    setError(null)
    setSaving(true)
    const payload = { type, category_id: categoryId, amount: value, date, description: description.trim() || null }
    try {
      const saved = isEdit ? await updateTransaction(transaction.id, payload) : await createTransaction(payload)
      onSaved(saved, !isEdit)
    } catch (err) {
      // 422 (wrong type, other currency, ...) and 404 details come straight from the API.
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={isEdit ? 'Edit transaction' : 'Add transaction'}
      onClose={onClose}
      footer={
        <>
          {isEdit && (
            <Button variant="ghost" className="mr-auto text-status-over hover:bg-status-over/10 hover:text-status-over" onClick={() => onDelete(transaction)} disabled={saving}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {isEdit ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4" noValidate>
        <SegmentedControl label="Transaction type" value={type} options={TYPE_OPTIONS} onChange={changeType} className="w-full" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${formId}-amount`} className={labelClass}>
              Amount ({currency})
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
          <div>
            <label htmlFor={`${formId}-date`} className={labelClass}>
              Date
            </label>
            <input
              id={`${formId}-date`}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor={`${formId}-category`} className={labelClass}>
            Category
          </label>
          {options.length > 0 ? (
            <select
              id={`${formId}-category`}
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className={inputClass}
            >
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="rounded-control border border-dashed border-border-strong px-3 py-2.5 text-sm text-text-muted">
              No {type} categories yet.{' '}
              <Link to="/categories" className="font-medium text-primary-text hover:underline">
                Create one
              </Link>
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${formId}-description`} className={labelClass}>
            Description <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <input
            id={`${formId}-description`}
            type="text"
            maxLength={255}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'income' ? 'e.g. October salary' : 'e.g. Groceries at the market'}
            className={inputClass}
          />
        </div>

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
