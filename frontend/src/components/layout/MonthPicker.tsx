import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMonth } from '../../hooks/useMonth'
import { monthLabel } from '../../lib/dates'

export function MonthPicker() {
  const { year, month, isCurrent, prev, next, reset } = useMonth()

  const arrow =
    'flex size-11 sm:size-8 items-center justify-center rounded-chip text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-primary'

  return (
    <div className="flex items-center gap-1">
      {!isCurrent && (
        <button
          type="button"
          onClick={reset}
          className="mr-1 hidden h-8 rounded-chip px-2.5 text-xs font-medium text-primary-text hover:bg-primary/10 sm:block"
        >
          Current
        </button>
      )}
      <div className="flex items-center rounded-control border border-border bg-surface">
        <button type="button" onClick={prev} className={arrow} aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-20 text-center text-sm font-medium text-text tabular-nums sm:min-w-28" aria-live="polite">
          <span className="sm:hidden">{monthLabel({ year, month }, 'compact')}</span>
          <span className="hidden sm:inline">{monthLabel({ year, month })}</span>
        </span>
        <button type="button" onClick={next} className={arrow} aria-label="Next month">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
