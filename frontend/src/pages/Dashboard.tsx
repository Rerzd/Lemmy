import { Link } from 'react-router-dom'
import { ArrowRight, ChartPie, Plus, Receipt, Target } from 'lucide-react'
import { getBudgetStatus } from '../api/budgets'
import { listCategories } from '../api/categories'
import { getByCategory, getOverview, getTrend } from '../api/summary'
import { listTransactions } from '../api/transactions'
import { CategoryDonut } from '../components/dashboard/CategoryDonut'
import { KpiCards } from '../components/dashboard/KpiCards'
import { TrendChart } from '../components/dashboard/TrendChart'
import { TransactionItem } from '../components/transactions/TransactionItem'
import { BudgetProgress, BudgetStatusLabel } from '../components/ui/BudgetProgress'
import { Card } from '../components/ui/Card'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton, SkeletonRows } from '../components/ui/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { useCurrency } from '../hooks/useAuth'
import { useMonth } from '../hooks/useMonth'
import { formatMoney } from '../lib/money'

function CardLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-xs font-medium text-primary-text hover:underline">
      {children}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  )
}

export function DashboardPage() {
  const currency = useCurrency()
  const { year, month, search } = useMonth()
  const period = `${year}-${month}`

  const overview = useAsync(() => getOverview(month, year), period)
  const trend = useAsync(() => getTrend(6), 'trend')
  const byCategory = useAsync(() => getByCategory(month, year, 'expense'), period)
  const budgets = useAsync(() => getBudgetStatus(month, year), period)
  const recent = useAsync(() => listTransactions({ month, year, limit: 6 }), period)
  const categories = useAsync(listCategories, 'categories')

  const categoryById = new Map(categories.data?.map((c) => [c.id, c]))
  const topBudgets = [...(budgets.data ?? [])].sort((a, b) => b.pct_used - a.pct_used).slice(0, 5)
  const spentTotal = byCategory.data?.reduce((sum, row) => sum + row.total, 0) ?? 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {overview.error ? (
        <Card>
          <ErrorState message={overview.error} onRetry={overview.reload} />
        </Card>
      ) : (
        <KpiCards overview={overview.data} currency={currency} />
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
        <Card title="Income vs expenses" action={<span className="text-xs text-text-muted">Last 6 months</span>} className="lg:col-span-3">
          {trend.error ? (
            <ErrorState message={trend.error} onRetry={trend.reload} />
          ) : trend.data ? (
            <TrendChart points={trend.data} currency={currency} />
          ) : (
            <Skeleton className="h-72 w-full" />
          )}
        </Card>

        <Card title="Spending by category" className="lg:col-span-2">
          {byCategory.error ? (
            <ErrorState message={byCategory.error} onRetry={byCategory.reload} />
          ) : !byCategory.data ? (
            <div className="flex items-center gap-5">
              <Skeleton className="size-40 rounded-full" />
              <div className="flex-1">
                <SkeletonRows rows={4} />
              </div>
            </div>
          ) : byCategory.data.length === 0 ? (
            <EmptyState
              icon={ChartPie}
              title="No spending this month"
              description="Expenses you record will be broken down here."
              action={<CardLink to={`/transactions${search}`}>Add a transaction</CardLink>}
            />
          ) : (
            <CategoryDonut rows={byCategory.data} total={spentTotal} currency={currency} />
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card title="Budgets" action={<CardLink to={`/budgets${search}`}>View all</CardLink>}>
          {budgets.error ? (
            <ErrorState message={budgets.error} onRetry={budgets.reload} />
          ) : !budgets.data ? (
            <SkeletonRows rows={4} />
          ) : topBudgets.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No budgets for this month"
              description="Set a spending limit per category to see how you're tracking."
              action={<CardLink to={`/budgets${search}`}>Create a budget</CardLink>}
            />
          ) : (
            <ul className="space-y-4">
              {topBudgets.map((b) => (
                <li key={b.budget_id}>
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <CategoryIcon icon={b.icon} color={b.color} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-text">{b.name}</span>
                    <BudgetStatusLabel status={b.status} />
                  </div>
                  <BudgetProgress pct={b.pct_used} status={b.status} />
                  <p className="mt-1 text-xs text-text-muted tabular-nums">
                    {formatMoney(b.spent, currency)} of {formatMoney(b.budgeted, currency)} · {b.pct_used.toFixed(0)}%
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent transactions" action={<CardLink to={`/transactions${search}`}>View all</CardLink>}>
          {recent.error ? (
            <ErrorState message={recent.error} onRetry={recent.reload} />
          ) : !recent.data ? (
            <SkeletonRows rows={6} />
          ) : recent.data.items.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions this month"
              description="Log income and expenses to see them here."
              action={
                <Link
                  to={`/transactions${search}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control bg-primary px-3 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
                >
                  <Plus className="size-4" aria-hidden />
                  Add transaction
                </Link>
              }
            />
          ) : (
            <div className="-my-1 divide-y divide-border">
              {recent.data.items.map((t) => (
                <TransactionItem key={t.id} transaction={t} category={categoryById.get(t.category_id)} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
