import type { YearMonth } from './dates'

export type PeriodKind = 'past' | 'current' | 'future'

export function daysInMonth({ year, month }: YearMonth): number {
  return new Date(year, month, 0).getDate()
}

export function periodKind(ym: YearMonth, today: Date): PeriodKind {
  const a = ym.year * 12 + ym.month
  const b = today.getFullYear() * 12 + today.getMonth() + 1
  return a < b ? 'past' : a > b ? 'future' : 'current'
}

// Days left including today, so on Oct 21 there are 11 days to go.
export function daysLeft(ym: YearMonth, today: Date): number {
  const kind = periodKind(ym, today)
  if (kind === 'past') return 0
  if (kind === 'future') return daysInMonth(ym)
  return daysInMonth(ym) - today.getDate() + 1
}

// Share of the month already behind us (0..1), counting today as half done.
export function monthProgress(ym: YearMonth, today: Date): number {
  const kind = periodKind(ym, today)
  if (kind === 'past') return 1
  if (kind === 'future') return 0
  return (today.getDate() - 0.5) / daysInMonth(ym)
}
