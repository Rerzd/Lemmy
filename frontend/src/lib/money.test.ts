import { describe, expect, it } from 'vitest'
import { formatMoney, formatPercent, formatSigned } from './money'

// Intl output uses non-breaking spaces; normalize so the expectations stay readable.
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ')

describe('formatMoney', () => {
  it('formats COP without decimals using Colombian separators', () => {
    expect(plain(formatMoney(1250000, 'COP'))).toBe('$ 1.250.000')
  })

  it('keeps cents for USD', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50')
  })

  it('supports a compact form', () => {
    expect(formatMoney(4_120_000, 'USD', { compact: true })).toBe('$4.1M')
    expect(formatMoney(8_000_000, 'USD', { compact: true })).toBe('$8M')
    expect(plain(formatMoney(1_800_000, 'COP', { compact: true }))).toBe('$1,8 M')
  })
})

describe('formatSigned', () => {
  it('prefixes the sign from the transaction type, not the number', () => {
    expect(plain(formatSigned(50000, 'COP', 'income'))).toBe('+ $ 50.000')
    expect(plain(formatSigned(50000, 'COP', 'expense'))).toBe('- $ 50.000')
    expect(plain(formatSigned(-50000, 'COP', 'expense'))).toBe('- $ 50.000')
  })
})

it('formatPercent rounds to the requested digits', () => {
  expect(formatPercent(12.345)).toBe('12.3%')
  expect(formatPercent(80, 0)).toBe('80%')
})
