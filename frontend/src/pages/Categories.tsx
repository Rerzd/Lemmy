import { useState } from 'react'
import { toast } from 'sonner'
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteCategory, listCategories } from '../api/categories'
import { getByCategory } from '../api/summary'
import { CategoryModal } from '../components/categories/CategoryModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ErrorState } from '../components/ui/ErrorState'
import { SkeletonRows } from '../components/ui/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { useCurrency } from '../hooks/useAuth'
import { currentYearMonth, monthLabel } from '../lib/dates'
import { getErrorMessage } from '../lib/errors'
import { formatMoney } from '../lib/money'
import type { Category, CategoryTotal, TxType } from '../types/api'

const SECTIONS: { type: TxType; title: string; empty: string }[] = [
  { type: 'income', title: 'Income', empty: 'No income categories yet. Add one for salary, freelance work or any other money coming in.' },
  { type: 'expense', title: 'Expenses', empty: 'No expense categories yet. Add one to start sorting where your money goes.' },
]

// "null" = closed, otherwise create (with a preset type) or edit.
type ModalState = null | { type: TxType } | Category

const iconButton =
  'flex size-11 shrink-0 items-center justify-center rounded-chip text-text-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary sm:size-9'

interface CategoryRowProps {
  category: Category
  activity?: CategoryTotal
  // Largest total in the section, so bars compare categories of the same type.
  max: number
  currency: string
  onEdit: () => void
  onDelete: () => void
}

function CategoryRow({ category, activity, max, currency, onEdit, onDelete }: CategoryRowProps) {
  const tone = category.type === 'income' ? 'bg-income' : 'bg-primary'
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${category.name}`}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-control px-2 py-2 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <CategoryIcon icon={category.icon} color={category.color} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium text-text">{category.name}</span>
              {category.is_fixed && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-chip bg-surface-2 px-1.5 py-0.5 text-xs text-text-muted">
                  <Lock className="size-3" aria-hidden />
                  Fixed
                </span>
              )}
            </span>
            {activity && <span className="shrink-0 text-sm font-semibold text-text">{formatMoney(activity.total, currency)}</span>}
          </span>
          {activity ? (
            <span className="mt-1.5 flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <span className={`block h-full rounded-full ${tone}`} style={{ width: `${max ? (activity.total / max) * 100 : 0}%` }} />
              </span>
              {/* Fixed width keeps every bar track the same length, so bars compare fairly. */}
              <span className="w-28 shrink-0 text-right text-xs whitespace-nowrap text-text-muted">
                {activity.count} {activity.count === 1 ? 'transaction' : 'transactions'}
              </span>
            </span>
          ) : (
            <span className="block text-xs text-text-muted">No activity this month</span>
          )}
        </span>
      </button>
      <button type="button" onClick={onEdit} aria-label={`Edit ${category.name}`} className={`${iconButton} hidden hover:text-text sm:flex`}>
        <Pencil className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={onDelete} aria-label={`Delete ${category.name}`} className={`${iconButton} hover:text-status-over`}>
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  )
}

export function CategoriesPage() {
  const currency = useCurrency()
  const categories = useAsync(listCategories, 'categories')
  // Categories aren't tied to a month; this month's activity gives each one context.
  const now = currentYearMonth()
  const income = useAsync(() => getByCategory(now.month, now.year, 'income'), 'activity-income')
  const expense = useAsync(() => getByCategory(now.month, now.year, 'expense'), 'activity-expense')
  const activity = { income: income.data, expense: expense.data }
  const [modal, setModal] = useState<ModalState>(null)
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const onSaved = (category: Category, created: boolean) => {
    setModal(null)
    toast.success(created ? `${category.name} added` : `${category.name} updated`)
    categories.reload()
    income.reload()
    expense.reload()
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteCategory(toDelete.id)
      toast.success(`${toDelete.name} deleted`)
      categories.reload()
    } catch (err) {
      // 409 when it still has transactions or budgets; the API says how many.
      toast.error(getErrorMessage(err), { duration: 6000 })
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  if (categories.error) {
    return (
      <Card>
        <ErrorState message={categories.error} onRetry={categories.reload} />
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          Each category has its own color and icon. Totals are for {monthLabel(now)}.
        </p>
        <Button onClick={() => setModal({ type: 'expense' })} className="shrink-0">
          <Plus className="size-4" aria-hidden />
          <span className="sm:hidden">Add</span>
          <span className="hidden sm:inline">Add category</span>
        </Button>
      </div>

      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-2">
        {SECTIONS.map((section) => {
          const items = categories.data?.filter((c) => c.type === section.type)
          const totals = new Map(activity[section.type]?.map((row) => [row.category_id, row]))
          const max = Math.max(0, ...[...totals.values()].map((row) => row.total))
          const sum = [...totals.values()].reduce((acc, row) => acc + row.total, 0)
          // Busiest categories first; the rest keep their creation order.
          const sorted = items && [...items].sort((a, b) => (totals.get(b.id)?.total ?? 0) - (totals.get(a.id)?.total ?? 0))
          return (
            <section
              key={section.type}
              aria-labelledby={`section-${section.type}`}
              className="rounded-surface border border-border bg-surface"
            >
              <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="min-w-0">
                  <h2 id={`section-${section.type}`} className="text-lg font-semibold text-text">
                    {section.title}
                    {items && <span className="ml-2 font-sans text-sm font-normal text-text-muted">{items.length}</span>}
                  </h2>
                  {activity[section.type] && (
                    <p className="text-xs text-text-muted">
                      {formatMoney(sum, currency)} {section.type === 'income' ? 'received' : 'spent'} this month
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModal({ type: section.type })}
                  aria-label={`Add ${section.type} category`}
                  className="-mr-2 shrink-0"
                >
                  <Plus className="size-4" aria-hidden />
                  <span className="sm:hidden">Add</span>
                  <span className="hidden sm:inline">Add {section.type}</span>
                </Button>
              </header>

              <div className="px-3 py-2">
                {!sorted ? (
                  <div className="p-2">
                    <SkeletonRows rows={3} />
                  </div>
                ) : sorted.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-text-muted">{section.empty}</p>
                ) : (
                  <ul>
                    {sorted.map((c) => (
                      <CategoryRow
                        key={c.id}
                        category={c}
                        activity={totals.get(c.id)}
                        max={max}
                        currency={currency}
                        onEdit={() => setModal(c)}
                        onDelete={() => setToDelete(c)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {modal && (
        <CategoryModal
          category={'id' in modal ? modal : null}
          defaultType={modal.type}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete category?"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        {toDelete && (
          <p>
            <span className="font-medium text-text">{toDelete.name}</span> will be removed. Categories that still have
            transactions or budgets can't be deleted until those are moved or removed.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
