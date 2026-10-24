import { CloudOff, History, PowerOff } from 'lucide-react'
import { formatAge } from '../../lib/external'

const line = 'flex items-start gap-2 text-sm'

// One calm line for the states without a value: never an error banner.
export function ExternalNotice({ kind, what, onRetry }: { kind: 'off' | 'unavailable'; what?: string; onRetry?: () => void }) {
  if (kind === 'off') {
    return (
      <p className={`${line} text-text-muted`}>
        <PowerOff className="mt-0.5 size-4 shrink-0" aria-hidden />
        External data is off.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2">
      <p className={`${line} text-text-muted`}>
        <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
        {what} unavailable right now.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="-my-2 inline-flex min-h-11 items-center rounded-chip px-2 text-sm font-medium text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-primary sm:min-h-8"
        >
          Try again
        </button>
      )}
    </div>
  )
}

// Shown under a value that came from the cache because the source isn't answering.
export function StaleNote({ age, what }: { age: number | null; what: string }) {
  return (
    <p className="flex items-start gap-2 text-xs text-text">
      <History className="mt-0.5 size-3.5 shrink-0 text-status-warning" aria-hidden />
      <span>
        Showing the last known {what}
        {age !== null && `, updated ${formatAge(age)}`}. The source isn't answering right now.
      </span>
    </p>
  )
}
