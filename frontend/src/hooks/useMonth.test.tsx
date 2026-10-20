import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMonth } from './useMonth'

function setup(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  return renderHook(() => ({ month: useMonth(), location: useLocation() }), { wrapper })
}

describe('useMonth', () => {
  beforeEach(() => {
    // "Today" is 20 Oct 2026 for every test.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 20))
  })
  afterEach(() => vi.useRealTimers())

  it('defaults to the current month with no param', () => {
    const { result } = setup('/budgets')
    expect(result.current.month).toMatchObject({ year: 2026, month: 10, isCurrent: true, search: '' })
  })

  it('reads ?month and builds a search string for links', () => {
    const { result } = setup('/budgets?month=2026-03')
    expect(result.current.month).toMatchObject({ year: 2026, month: 3, isCurrent: false, search: '?month=2026-03' })
  })

  it('ignores an invalid param', () => {
    const { result } = setup('/budgets?month=2026-13')
    expect(result.current.month).toMatchObject({ year: 2026, month: 10, search: '' })
  })

  it('moves across years, keeps other params and resets pagination', () => {
    const { result } = setup('/transactions?month=2026-01&type=expense&page=3')
    act(() => result.current.month.prev())
    const params = new URLSearchParams(result.current.location.search)
    expect(params.get('month')).toBe('2025-12')
    expect(params.get('type')).toBe('expense')
    expect(params.has('page')).toBe(false)
  })

  it('drops the param when going back to the current month', () => {
    const { result } = setup('/budgets?month=2026-09')
    act(() => result.current.month.next())
    expect(result.current.location.search).toBe('')
    expect(result.current.month.isCurrent).toBe(true)
  })
})
