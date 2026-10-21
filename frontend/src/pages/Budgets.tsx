import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Target } from 'lucide-react'
import { deleteBudget, getBudgetStatus } from '../api/budgets'
import { listCategories } from '../api/categories'
import { BudgetRow } from '../components/budgets/BudgetRow'
import { BudgetModal } from '../components/budgets/BudgetModal'
import { BudgetProgress } from '../components/ui/BudgetProgress'
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
import { monthLabel, type YearMonth } from '../lib/dates'
import { getErrorMessage } from '../lib/errors'
import { formatMoney } from '../lib/money'
import { daysLeft, monthProgress, periodKind } from '../lib/period'
import type { BudgetHealth, BudgetStatus } from '../types/api'

// "null" = closed, "new" = create, otherwise the budget being edited.
type ModalState = null | 'new' | BudgetStatus

interface PlanProps {
  budgets: BudgetStatus[]
  period: YearMonth
  pace: number | undefined
  currency: string
}

// The month's plan in one sentence, then the totals and one bar for all budgets together.
function Plan({ budgets, period, pace, currency }: PlanProps) {
  const budgeted = budgets.reduce((sum, b) => sum + b.budgeted, 0)
  const spent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const left = budgeted - spent
  const pct = budgeted ? (spent / budgeted) * 100 : 0
  const overall: BudgetHealth = pct > 100 ? 'over' : pct >= 80 ? 'warning' : 'ok'
  const kind = periodKind(period, new Date())
  const n = daysLeft(period, new Date())
  const count = `${budgets.length} budget${budgets.length === 1 ? '' : 's'}`
  const amount = (
    <strong className={`font-bold whitespace-nowrap ${left < 0 ? 'text-status-over' : 'text-status-ok'}`}>{formatMoney(Math.abs(left), currency)}</strong>
  )
  const when = kind === 'current' ? (n === 1 ? ', last day of the month.' : `, ${n} days to go.`) : kind === 'future' ? ', before the month starts.' : ` at the end of ${monthLabel(period)}.`

  return (
    <section className="rounded-surface border border-border bg-surface shadow-raised" aria-labelledby="plan">
      <div className="p-5 sm:p-7">
        <p className="text-xs font-semibold tracking-wide text-primary-text uppercase">{monthLabel(period)}</p>
        <h2 id="plan" className="mt-2 max-w-3xl text-xl leading-snug font-semibold text-balance text-text sm:text-2xl">
          {amount} {left < 0 ? 'over' : 'left'} across {count}
          {when}
        </h2>
        <div className="mt-5">
          <BudgetProgress pct={pct} status={overall} pace={pace} />
          <p className="mt-1.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-text-muted">
            <span>
              <span className="font-semibold text-text">{formatMoney(spent, currency)}</span> spent of{' '}
              <span className="font-semibold text-text">{formatMoney(budgeted, currency)}</span>
            </span>
            <span>{pct.toFixed(0)}% used</span>
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border px-5 py-3 text-xs sm:px-7">
        {(['over', 'warning', 'ok'] as BudgetHealth[]).map((s) => {
          const n = budgets.filter((b) => b.status === s).length
          const { label, text, icon: Icon } = BUDGET_STATUS[s]
          return (
            <li key={s} className={`inline-flex items-center gap-1 ${n ? text : 'text-text-muted'}`}>
              <Icon className="size-3.5" aria-hidden />
              <span>{n}</span> {label.toLowerCase()}
            </li>
          )
        })}
        {pace !== undefined && (
          <li className="inline-flex items-center gap-1.5 text-text-muted sm:ml-auto">
            <span className="h-3 w-0.5 rounded-full bg-text" aria-hidden />
            Even pace: {Math.round(pace * 100)}% of the month is behind you
          </li>
        )}
      </ul>
    </section>
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

  const budgets = [...(status.data ?? [])].sort((a, b) => b.pct_used - a.pct_used)
  const taken = new Set(budgets.map((b) => b.category_id))
  const available = (categories.data ?? []).filter((c) => c.type === 'expense' && !taken.has(c.id))
  // Only the running month has a pace to compare against.
  const pace = periodKind(period, new Date()) === 'current' ? monthProgress(period, new Date()) : undefined

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
          <Skeleton className="h-48 w-full rounded-surface" />
          <Skeleton className="h-80 w-full rounded-surface" />
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
          <Plan budgets={budgets} period={period} pace={pace} currency={currency} />
          <section
            aria-labelledby="budgets-heading"
            className={`rounded-surface border border-border bg-surface transition-opacity ${status.loading ? 'opacity-60' : ''}`}
          >
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <h2 id="budgets-heading" className="text-lg font-semibold text-text">
                Budgets
                <span className="ml-2 font-sans text-sm font-normal text-text-muted">{budgets.length}</span>
              </h2>
              {addButton}
            </header>
            {/* Most used first, so the budgets that need attention lead. */}
            <ul className="divide-y divide-border px-3 py-1">
              {budgets.map((b) => (
                <BudgetRow
                  key={b.budget_id}
                  budget={b}
                  currency={currency}
                  pace={pace}
                  onEdit={() => setModal(b)}
                  onDelete={() => setToDelete(b)}
                />
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
            The <span className="font-medium text-text">{toDelete.name}</span> budget for {monthLabel(period)} will be
            removed. Your transactions stay as they are.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
