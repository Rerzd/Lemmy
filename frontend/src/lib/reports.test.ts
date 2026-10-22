import { describe, expect, it } from 'vitest'
import type { LivingCosts } from '../types/api'
import { buildLivingCostsHeadline, cushionText, monthsUsedNote } from './reports'

const plain = (s: string | null) => s?.replace(/[\u00a0\u202f]/g, ' ') ?? null
const split = (fixed: number, variable: number) => ({
  fixed,
  variable,
  total: fixed + variable,
  fixed_share: fixed + variable ? fixed / (fixed + variable) : null,
})

function report(overrides: Partial<LivingCosts> = {}): LivingCosts {
  return {
    month: '2026-10',
    months_used: 3,
    baseline_months: ['2026-07', '2026-08', '2026-09'],
    this_month: split(1_650_000, 1_200_000),
    baseline: split(1_900_000, 1_300_000),
    min_monthly_income: 3_200_000,
    savings: 7_680_000,
    cushion_months: 2.4,
    categories: [],
    ...overrides,
  }
}

const sentence = (r: LivingCosts, currency = 'COP') => {
  const h = buildLivingCostsHeadline(r, currency)
  return { text: plain(h.parts.map((p) => p.text).join('')), detail: plain(h.detail), parts: h.parts }
}

describe('buildLivingCostsHeadline', () => {
  it('states the monthly cost, the fixed part and the cushion', () => {
    const h = sentence(report())
    expect(h.text).toBe('Living costs about $3,2 M a month. $1,9 M is fixed.')
    expect(h.detail).toBe('Your savings cover about 2.4 months.')
    expect(h.parts.filter((p) => p.emphasis).map((p) => plain(p.text))).toEqual(['$3,2 M', '$1,9 M'])
  })

  it('formats other currencies with their own locale', () => {
    expect(sentence(report({ baseline: split(1200, 800) }), 'USD').text).toBe('Living costs about $2K a month. $1.2K is fixed.')
  })

  it('handles all-fixed and all-variable baselines', () => {
    expect(sentence(report({ baseline: split(0, 900_000) })).text).toBe('Living costs about $900 k a month. All of it is variable.')
    expect(sentence(report({ baseline: split(900_000, 0) })).text).toBe('Living costs about $900 k a month. All of it is fixed.')
  })

  it('says when there are no savings to cover it', () => {
    expect(sentence(report({ cushion_months: 0, savings: 0 })).detail).toBe("You don't have savings to cover it yet.")
  })

  it('explains the no-history case instead of showing zeros', () => {
    const none = report({ months_used: 0, baseline_months: [], baseline: null, min_monthly_income: null, cushion_months: null })
    expect(sentence(none).text).toBe('Not enough history yet to estimate your living costs.')
    expect(sentence(none).detail).toBe("So far this month you've spent $2,9 M. The estimate starts once a full month is recorded.")
    expect(sentence({ ...none, this_month: split(0, 0) }).detail).toBe('The estimate starts once a full month of spending is recorded.')
  })

  it('handles history without any spending', () => {
    const h = sentence(report({ months_used: 2, baseline: split(0, 0), cushion_months: null }))
    expect(h.text).toBe('No spending recorded in the last 2 months.')
    expect(h.detail).toBeNull()
  })
})

describe('cushionText', () => {
  it.each([
    [2.4, 'about 2.4 months'],
    [1, 'about 1 month'],
    [3.04, 'about 3 months'],
    [0.5, 'about 15 days'],
    [0.01, 'about 1 day'],
  ])('%s -> %s', (months, text) => {
    expect(cushionText(months)).toBe(text)
  })
})

describe('monthsUsedNote', () => {
  it.each([
    [3, null],
    [2, 'Based on 2 months of history'],
    [1, 'Based on 1 month of history'],
    [0, 'No complete months of history yet'],
  ])('%s months -> %s', (n, note) => {
    expect(monthsUsedNote(n)).toBe(note)
  })
})
