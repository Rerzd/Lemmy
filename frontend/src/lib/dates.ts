export interface YearMonth {
  year: number
  month: number // 1-12
}

export function currentYearMonth(): YearMonth {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function toMonthParam({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function parseMonthParam(value: string | null): YearMonth | null {
  const match = value?.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  return month >= 1 && month <= 12 ? { year, month } : null
}

// long: "October 2026" · compact: "Oct 2026" · short: "Oct"
export function monthLabel({ year, month }: YearMonth, style: 'long' | 'compact' | 'short' = 'long'): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: style === 'long' ? 'long' : 'short',
    year: style === 'short' ? undefined : 'numeric',
  })
}

// Local "today" as YYYY-MM-DD (toISOString would use UTC and can be off by a day).
export function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
