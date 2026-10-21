import { describe, expect, it } from 'vitest'
import { buildHeadline, headlineText } from './headline'
import { daysInMonth, daysLeft, monthProgress, periodKind } from './period'

const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ')
const TODAY = new Date(2026, 9, 21) // 21 Oct 2026
const OCT = { year: 2026, month: 10 }
const SEP = { year: 2026, month: 9 }
const activity = { income: 2_600_000, expense: 3_719_300, transaction_count: 30 }
const budget = (budgeted: number, spent: number, status: 'ok' | 'warning' | 'over' = 'ok') => ({ budgeted, spent, status })

describe('period helpers', () => {
  it('counts days including today', () => {
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29)
    expect(daysLeft(OCT, TODAY)).toBe(11)
    expect(daysLeft(OCT, new Date(2026, 9, 31))).toBe(1)
    expect(daysLeft(SEP, TODAY)).toBe(0)
    expect(daysLeft({ year: 2026, month: 11 }, TODAY)).toBe(30)
  })

  it('classifies months and measures progress', () => {
    expect(periodKind(SEP, TODAY)).toBe('past')
    expect(periodKind(OCT, TODAY)).toBe('current')
    expect(periodKind({ year: 2027, month: 1 }, TODAY)).toBe('future')
    expect(monthProgress(OCT, TODAY)).toBeCloseTo(20.5 / 31)
    expect(monthProgress(SEP, TODAY)).toBe(1)
  })
})

describe('buildHeadline', () => {
  const text = (...args: Parameters<typeof buildHeadline>) => {
    const h = buildHeadline(...args)
    return { sentence: plain(headlineText(h)), detail: h.detail && plain(h.detail), parts: h.parts }
  }

  it('leads with what is left in the budgets this month', () => {
    const h = text(OCT, TODAY, activity, [budget(4_000_000, 3_000_000), budget(230_000, 640_300, 'over')], 'COP')
    expect(h.sentence).toBe('You have $ 589.700 left in your budgets, 11 days to go.')
    expect(h.detail).toBe("That's about $ 53.609 a day.")
    const strong = h.parts.find((p) => p.emphasis)
    expect(strong?.emphasis).toBe('good')
    expect(plain(strong?.text ?? '')).toBe('$ 589.700')
  })

  it('says when the budgets are already exceeded', () => {
    const h = text(OCT, TODAY, activity, [budget(100_000, 150_000, 'over'), budget(50_000, 20_000)], 'COP')
    expect(h.sentence).toBe("You're $ 20.000 over your budgets, with 11 days to go.")
    expect(h.detail).toBe('1 of 2 budgets are over the limit.')
  })

  it('handles the last day of the month', () => {
    const h = text(OCT, new Date(2026, 9, 31), activity, [budget(100, 40)], 'USD')
    expect(h.sentence).toBe('You have $60.00 left in your budgets, and today is the last day of the month.')
    expect(h.detail).toBeNull()
  })

  it('falls back to income minus spending without budgets', () => {
    expect(text(OCT, TODAY, { income: 500, expense: 200, transaction_count: 3 }, [], 'USD').sentence).toBe(
      "You have $300.00 left from this month's income, 11 days to go.",
    )
    expect(text(OCT, TODAY, activity, [], 'COP').sentence).toBe("You've spent $ 1.119.300 more than you earned, with 11 days to go.")
    expect(text(OCT, TODAY, { income: 0, expense: 0, transaction_count: 0 }, [], 'COP').sentence).toBe(
      'Nothing recorded yet for October 2026, 11 days to go.',
    )
  })

  it('summarizes a past month', () => {
    expect(text(SEP, TODAY, activity, [budget(1000, 1200, 'over')], 'USD')).toMatchObject({
      sentence: 'In September 2026 you spent $1,200.00 of $1,000.00 budgeted, $200.00 over.',
      detail: '1 budget went over the limit.',
    })
    expect(text(SEP, TODAY, { income: 900, expense: 400, transaction_count: 9 }, [], 'USD').sentence).toBe('In September 2026 you saved $500.00.')
    expect(text(SEP, TODAY, { income: 0, expense: 0, transaction_count: 0 }, [], 'USD').sentence).toBe('No transactions in September 2026.')
  })

  it('treats future months as not started', () => {
    expect(text({ year: 2027, month: 1 }, TODAY, { income: 0, expense: 0, transaction_count: 0 }, [], 'USD').sentence).toBe(
      "January 2027 hasn't started yet.",
    )
  })
})
