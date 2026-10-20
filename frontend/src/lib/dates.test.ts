import { describe, expect, it } from 'vitest'
import { formatDate, monthLabel, parseMonthParam, shiftMonth, toMonthParam } from './dates'

describe('shiftMonth', () => {
  it('moves within a year', () => {
    expect(shiftMonth({ year: 2026, month: 5 }, 2)).toEqual({ year: 2026, month: 7 })
  })

  it('crosses year boundaries in both directions', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(shiftMonth({ year: 2026, month: 3 }, -15)).toEqual({ year: 2024, month: 12 })
  })
})

describe('month URL param', () => {
  it('pads the month', () => {
    expect(toMonthParam({ year: 2026, month: 3 })).toBe('2026-03')
  })

  it('round-trips through parseMonthParam', () => {
    expect(parseMonthParam(toMonthParam({ year: 2027, month: 11 }))).toEqual({ year: 2027, month: 11 })
  })

  it.each([null, '', '2026-13', '2026-00', '2026-3', 'march', '2026-03-01'])('rejects %j', (value) => {
    expect(parseMonthParam(value)).toBeNull()
  })
})

describe('labels', () => {
  it('formats months in three styles', () => {
    const ym = { year: 2026, month: 10 }
    expect(monthLabel(ym)).toBe('October 2026')
    expect(monthLabel(ym, 'compact')).toBe('Oct 2026')
    expect(monthLabel(ym, 'short')).toBe('Oct')
  })

  it('formats ISO dates without shifting the day across time zones', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026')
  })
})
