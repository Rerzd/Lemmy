import { getTrm } from '../../api/external'
import { useExternal } from '../../hooks/useExternal'
import { currentAge, formatAge, formatTrm, validityLabel } from '../../lib/external'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { ExternalNotice, StaleNote } from './ExternalNotice'

// The official dollar rate (TRM). Loads on its own, so the dashboard never waits for it.
export function TrmCard({ className = '' }: { className?: string }) {
  const trm = useExternal('trm', getTrm)
  const data = trm.data

  let body
  if (trm.loading) {
    body = (
      <div role="status" aria-label="Loading the dollar rate">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-3.5 w-52" />
      </div>
    )
  } else if (data?.status === 'off') {
    body = <ExternalNotice kind="off" />
  } else if (!data || data.value === null || data.status === 'unavailable') {
    body = <ExternalNotice kind="unavailable" what="The dollar rate is" onRetry={trm.reload} />
  } else {
    const age = currentAge(data.age_seconds, trm.receivedAt)
    body = (
      <div className="space-y-3">
        <div>
          <p className="font-display text-2xl font-semibold text-text">{formatTrm(data.value)}</p>
          <p className="mt-0.5 text-sm text-text-muted">
            COP per US dollar
            {data.valid_from && data.valid_to && <> · {validityLabel(data.valid_from, data.valid_to)}</>}
          </p>
        </div>
        {data.stale ? (
          <StaleNote age={age} what="value" />
        ) : (
          <p className="text-xs text-text-muted">
            {age !== null && <>Updated {formatAge(age)} · </>}
            Official TRM from Superfinanciera, via datos.gov.co
          </p>
        )}
      </div>
    )
  }

  return (
    <Card title="Dollar today" className={className}>
      {body}
    </Card>
  )
}
