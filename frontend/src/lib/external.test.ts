import { describe, expect, it } from 'vitest'
import { convert, crossRate, currencyOption, currentAge, formatAge, formatRate, formatTrm, swapPair, validityLabel } from './external'

const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ')

// Rates against USD as the API sends them (USD itself is left out on purpose).
const USD = { COP: 3179.863094, EUR: 0.86, CLP: 984.682493 }

describe('formatAge', () => {
  it.each([
    [0, 'just now'],
    [59, 'just now'],
    [60, '1 min ago'],
    [3599, '59 min ago'],
    [3 * 3600 + 1200, '3 h ago'],
    [86_399, '23 h ago'],
    [86_400, '1 day ago'],
    [3 * 86_400, '3 days ago'],
    [-5, 'just now'],
  ])('%d s -> %s', (seconds, text) => {
    expect(formatAge(seconds)).toBe(text)
  })
})

describe('currentAge', () => {
  it('adds the time spent in the client cache', () => {
    expect(currentAge(3600, 1_000_000, 1_000_000 + 30 * 60_000)).toBe(5400)
    expect(currentAge(10, 5000, 4000)).toBe(10) // a clock that went backwards never makes it younger
    expect(currentAge(null, 0, 1)).toBeNull()
  })
})

describe('validityLabel', () => {
  it('reads as one day or a range', () => {
    expect(validityLabel('2026-10-23', '2026-10-23')).toBe('Valid for Oct 23, 2026')
    expect(validityLabel('2026-10-24', '2026-10-26')).toBe('Valid Oct 24 – Oct 26, 2026')
    expect(validityLabel('2025-12-31', '2026-01-02')).toBe('Valid Dec 31, 2025 – Jan 2, 2026')
  })
})

describe('formatting', () => {
  it('shows the TRM with its two decimals', () => {
    expect(plain(formatTrm(3158.43))).toBe('$ 3.158,43')
    expect(plain(formatTrm(4000))).toBe('$ 4.000,00')
  })

  it('never rounds a small rate to zero', () => {
    expect(formatRate(3179.863094)).toBe('3,179.8631')
    expect(formatRate(1)).toBe('1.00')
    expect(formatRate(1 / 3179.863094)).toBe('0.0003145')
    expect(formatRate(0.86)).toBe('0.86')
  })

  it('names currencies in the selects', () => {
    expect(currencyOption('COP')).toBe('COP · Colombian Peso')
  })
})

describe('crossRate', () => {
  it('goes through the dollar', () => {
    expect(crossRate(USD, 'USD', 'COP')).toBe(3179.863094)
    expect(crossRate(USD, 'COP', 'USD')).toBeCloseTo(0.00031447895, 11)
    expect(crossRate(USD, 'EUR', 'COP')).toBeCloseTo(3697.5152, 4) // 3179.863094 / 0.86
    expect(crossRate(USD, 'COP', 'COP')).toBe(1)
  })

  it('is null when a currency is missing or broken', () => {
    expect(crossRate(USD, 'USD', 'MXN')).toBeNull()
    expect(crossRate({ COP: 0 }, 'COP', 'USD')).toBeNull()
    expect(crossRate({ COP: Number.NaN }, 'USD', 'COP')).toBeNull()
  })
})

describe('convert', () => {
  it('rounds once, to the target currency', () => {
    expect(convert(100, 3179.863094, 'COP')).toBe(317_986) // 317,986.3094
    expect(convert(1_000_000, 1 / 3179.863094, 'USD')).toBe(314.48) // 314.4789...
    expect(convert(250, 0.86 / 1, 'EUR')).toBe(215)
    expect(convert(1, 984.682493, 'CLP')).toBe(985)
    expect(convert(0, 3179.86, 'COP')).toBe(0)
  })

  it('round trips within a cent', () => {
    const rate = crossRate(USD, 'EUR', 'USD')!
    const back = crossRate(USD, 'USD', 'EUR')!
    expect(convert(convert(123.45, rate, 'USD'), back, 'EUR')).toBeCloseTo(123.45, 2)
  })
})

describe('swapPair', () => {
  it('swaps from and to and keeps the rest', () => {
    expect(swapPair({ from: 'USD', to: 'COP', amount: 5 })).toEqual({ from: 'COP', to: 'USD', amount: 5 })
    expect(swapPair(swapPair({ from: 'EUR', to: 'MXN' }))).toEqual({ from: 'EUR', to: 'MXN' })
  })
})
