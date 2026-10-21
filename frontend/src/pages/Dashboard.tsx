import { Link } from 'react-router-dom'
import { ArrowRight, ChartBar, Plus, Receipt } from 'lucide-react'
import { getBudgetStatus } from '../api/budgets'
import { listCategories } from '../api/categories'
import { getByCategory, getOverview, getTrend } from '../api/summary'
import { listTransactions } from '../api/transactions'
import { CategoryBars } from '../components/dashboard/CategoryBars'
import { Headline } from '../components/dashboard/Headline'
import { TrendChart } from '../components/dashboard/TrendChart'
import { TransactionItem } from '../components/transactions/TransactionItem'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton, SkeletonRows } from '../components/ui/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { useCurrency } from '../hooks/useAuth'
import { useMonth } from '../hooks/useMonth'

function CardLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-chip px-2 text-xs font-medium text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-primary sm:min-h-8"
    >
      {children}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  )
}

const addLink =
  'inline-flex min-h-11 items-center gap-1.5 rounded-control bg-primary px-3 text-sm font-medium text-primary-contrast hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-8'

export function DashboardPage() {
  const currency = useCurrency()
  const { year, month, search } = useMonth()
  const period = `${year}-${month}`

  const overview = useAsync(() => getOverview(month, year), period)
  const budgets = useAsync(() => getBudgetStatus(month, year), period)
  const byCategory = useAsync(() => getByCategory(month, year, 'expense'), period)
  const trend = useAsync(() => getTrend(6), 'trend')
  const recent = useAsync(() => listTransactions({ month, year, limit: 6 }), period)
  const categories = useAsync(listCategories, 'categories')

  const categoryById = new Map(categories.data?.map((c) => [c.id, c]))
  const headlineError = overview.error ?? budgets.error

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. The sentence */}
      {headlineError ? (
        <Card>
          <ErrorState
            message={headlineError}
            onRetry={() => {
              overview.reload()
              budgets.reload()
            }}
          />
        </Card>
      ) : (
        <Headline period={{ year, month }} overview={overview.data} budgets={budgets.data} currency={currency} />
      )}

      {/* 2. Where the money went */}
      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-5">
        <Card
          title="Spending by category"
          action={<CardLink to={`/budgets${search}`}>Budgets</CardLink>}
          className="lg:col-span-3"
        >
          {byCategory.error ? (
            <ErrorState message={byCategory.error} onRetry={byCategory.reload} />
          ) : !byCategory.data || !budgets.data ? (
            <SkeletonRows rows={5} />
          ) : byCategory.data.length === 0 && budgets.data.length === 0 ? (
            <EmptyState
              icon={ChartBar}
              title="No spending this month"
              description="Expenses you record will be ranked here by category."
              action={
                <Link to={`/transactions${search}`} className={addLink}>
                  <Plus className="size-4" aria-hidden />
                  Add a transaction
                </Link>
              }
            />
          ) : (
            <CategoryBars rows={byCategory.data} budgets={budgets.data} currency={currency} search={search} />
          )}
        </Card>

        <Card title="Recent transactions" action={<CardLink to={`/transactions${search}`}>View all</CardLink>} className="lg:col-span-2">
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
                <Link to={`/transactions${search}`} className={addLink}>
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

      {/* 3. The longer view */}
      <Card title="Income vs expenses" action={<span className="text-xs text-text-muted">Last 6 months</span>}>
        {trend.error ? (
          <ErrorState message={trend.error} onRetry={trend.reload} />
        ) : trend.data ? (
          <TrendChart points={trend.data} currency={currency} />
        ) : (
          <Skeleton className="h-72 w-full" />
        )}
      </Card>
    </div>
  )
}
