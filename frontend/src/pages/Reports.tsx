import { useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { downloadTransactionsCsv, getCategorySpending, getLivingCosts } from '../api/reports'
import { BaselineTable } from '../components/reports/BaselineTable'
import { CostGroup } from '../components/reports/CostGroup'
import { MonthlyTable } from '../components/reports/MonthlyTable'
import { ReportHeadline } from '../components/reports/ReportHeadline'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { useCurrency } from '../hooks/useAuth'
import { useMonth } from '../hooks/useMonth'
import { monthLabel, shiftMonth, toMonthParam } from '../lib/dates'
import { getErrorMessage } from '../lib/errors'

export function ReportsPage() {
  const currency = useCurrency()
  const { year, month } = useMonth()
  const current = toMonthParam({ year, month })
  const from = toMonthParam(shiftMonth({ year, month }, -5))

  const living = useAsync(() => getLivingCosts(current), current)
  const spending = useAsync(() => getCategorySpending(from, current), `${from}:${current}`)
  const [downloading, setDownloading] = useState(false)

  const download = async () => {
    setDownloading(true)
    try {
      await downloadTransactionsCsv(current)
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't download the CSV. Please try again."))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted">What it costs you to live each month, from your own history.</p>
        <Button variant="secondary" onClick={download} loading={downloading} className="shrink-0" aria-label={`Download ${monthLabel({ year, month })} transactions as CSV`}>
          {!downloading && <Download className="size-4" aria-hidden />}
          <span className="sm:hidden">CSV</span>
          <span className="hidden sm:inline">Download CSV</span>
        </Button>
      </div>

      {living.error ? (
        <Card>
          <ErrorState message={living.error} onRetry={living.reload} />
        </Card>
      ) : !living.data ? (
        <>
          <Skeleton className="h-56 w-full rounded-surface" />
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-surface" />
            <Skeleton className="h-64 rounded-surface" />
          </div>
        </>
      ) : (
        <>
          <ReportHeadline report={living.data} currency={currency} />
          <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-2">
            <CostGroup kind="fixed" rows={living.data.categories} currency={currency} />
            <CostGroup kind="variable" rows={living.data.categories} currency={currency} />
          </div>
          <BaselineTable report={living.data} currency={currency} />
        </>
      )}

      {spending.error ? (
        <Card>
          <ErrorState message={spending.error} onRetry={spending.reload} />
        </Card>
      ) : spending.data ? (
        <MonthlyTable data={spending.data} currency={currency} />
      ) : (
        <Skeleton className="h-64 w-full rounded-surface" />
      )}
    </div>
  )
}
