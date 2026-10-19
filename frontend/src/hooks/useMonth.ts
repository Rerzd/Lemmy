import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { currentYearMonth, parseMonthParam, shiftMonth, toMonthParam, type YearMonth } from '../lib/dates'

/**
 * The selected month lives in the URL (?month=YYYY-MM) so it survives reloads,
 * can be shared, and follows the user across pages. No param means "this month".
 */
export function useMonth() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('month')

  const selected = useMemo<YearMonth>(() => parseMonthParam(raw) ?? currentYearMonth(), [raw])
  const isCurrent = toMonthParam(selected) === toMonthParam(currentYearMonth())

  const setMonth = useCallback(
    (value: YearMonth) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (toMonthParam(value) === toMonthParam(currentYearMonth())) next.delete('month')
        else next.set('month', toMonthParam(value))
        // Pagination belongs to the previous month's results.
        next.delete('page')
        return next
      })
    },
    [setParams],
  )

  return {
    ...selected,
    isCurrent,
    // Query string to carry the month along in links (empty for the current month).
    search: raw && parseMonthParam(raw) ? `?month=${raw}` : '',
    setMonth,
    prev: () => setMonth(shiftMonth(selected, -1)),
    next: () => setMonth(shiftMonth(selected, 1)),
    reset: () => setMonth(currentYearMonth()),
  }
}
