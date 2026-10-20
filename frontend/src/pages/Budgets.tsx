import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Target } from 'lucide-react'
import { deleteBudget, getBudgetStatus } from '../api/budgets'
import { listCategories } from '../api/categories'
import { BudgetCard } from '../components/budgets/BudgetCard'
import { BudgetModal } from '../components/budgets/BudgetModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { useCurrency } from '../hooks/useAuth'
import { useMonth } from '../hooks/useMonth'
import { BUDGET_STATUS } from '../lib/budgetStatus'
import { monthLabel } from '../lib/dates'
import { getErrorMessage } from '../lib/errors'
import { formatMoney } from '../lib/money'
import type { BudgetHealth, BudgetStatus } from '../types/api'

// "null" = closed, "new" = create, otherwise the budget being edited.
type ModalState = null | 'new' | BudgetStatus

function Summary({ budgets, currency }: { budgets: BudgetStatus[]; currency: string }) {
  const budgeted = budgets.reduce((sum, b) => sum + b.budgeted, 0)
  const spent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const counts = (['over', 'warning', 'ok'] as BudgetHealth[]).map((s) => [s, budgets.filter((b) => b.status === s).length] as const)

  // Full amounts from sm up; phones get the compact form so three columns fit.
  const stat = (label: string, value: number, className = 'text-slate-100') => (
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 truncate text-base font-semibold tabular-nums sm:text-lg ${className}`}>
        <span className="sm:hidden">{formatMoney(value, currency, { compact: true })}</span>
        <span className="hidden sm:inline">{formatMoney(value, currency)}</span>
      </p>
    </div>
  )

  return (
    <Card>
      <div className="grid grid-cols-3 gap-3">
        {stat('Budgeted', budgeted)}
        {stat('Spent', spent)}
        {budgeted - spent >= 0 ? stat('Left', budgeted - spent) : stat('Over', spent - budgeted, 'text-rose-400')}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-800 pt-3 text-xs">
        {counts.map(([status, n]) => {
          const { label, text, icon: Icon } = BUDGET_STATUS[status]
          return (
            <li key={status} className={`inline-flex items-center gap-1 ${n ? text : 'text-slate-500'}`}>
              <Icon className="size-3.5" aria-hidden />
              <span className="tabular-nums">{n}</span> {label.toLowerCase()}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function BudgetsPage() {
  const currency = useCurrency()
  const { year, month } = useMonth()
  const period = { year, month }

  const status = useAsync(() => getBudgetStatus(month, year), `${year}-${month}`)
  const categories = useAsync(listCategories, 'categories')

  const [modal, setModal] = useState<ModalState>(null)
  const [toDelete, setToDelete] = useState<BudgetStatus | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Most-used first, so budgets that need attention lead the page.
  const budgets = [...(status.data ?? [])].sort((a, b) => b.pct_used - a.pct_used)
  const taken = new Set(budgets.map((b) => b.category_id))
  const available = (categories.data ?? []).filter((c) => c.type === 'expense' && !taken.has(c.id))

  const onSaved = (created: boolean) => {
    setModal(null)
    toast.success(created ? 'Budget added' : 'Budget updated')
    status.reload()
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteBudget(toDelete.budget_id)
      toast.success(`${toDelete.name} budget deleted`)
      status.reload()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  const addButton = (
    <Button onClick={() => setModal('new')} disabled={!categories.data}>
      <Plus className="size-4" aria-hidden />
      Add budget
    </Button>
  )

  if (status.error) {
    return (
      <Card>
        <ErrorState message={status.error} onRetry={status.reload} />
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {!status.data ? (
        <>
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        </>
      ) : budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title={`No budgets for ${monthLabel(period)}`}
            description="Set a monthly limit on an expense category and Lemmy will track how much of it you've used."
            action={addButton}
          />
        </Card>
      ) : (
        <>
          <Summary budgets={budgets} currency={currency} />
          <section aria-labelledby="budgets-heading" className={status.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <header className="mb-3 flex items-center justify-between gap-3">
              <h2 id="budgets-heading" className="text-sm font-semibold text-slate-200">
                {monthLabel(period)}
                <span className="ml-2 font-normal text-slate-500 tabular-nums">{budgets.length}</span>
              </h2>
              {addButton}
            </header>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {budgets.map((b) => (
                <BudgetCard key={b.budget_id} budget={b} currency={currency} onEdit={() => setModal(b)} onDelete={() => setToDelete(b)} />
              ))}
            </ul>
          </section>
        </>
      )}

      {modal && (
        <BudgetModal
          budget={modal === 'new' ? null : modal}
          available={available}
          period={period}
          currency={currency}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete budget?"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        {toDelete && (
          <p>
            The <span className="font-medium text-slate-100">{toDelete.name}</span> budget for {monthLabel(period)} will be
            removed. Your transactions stay as they are.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
