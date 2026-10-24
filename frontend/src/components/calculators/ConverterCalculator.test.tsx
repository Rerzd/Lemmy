import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearExternalCache } from '../../hooks/useExternal'
import type { ExternalSource, Rates } from '../../types/api'
import { parseTool, TOOLS } from '../../lib/calculators/tools'
import { ConverterCalculator } from './ConverterCalculator'

vi.mock('../../api/external', () => ({ getUsdRates: vi.fn() }))
const external = await import('../../api/external')
const getUsdRates = vi.mocked(external.getUsdRates)

const SOURCE: ExternalSource = { id: 'rates', name: 'Rates By Exchange Rate API', url: 'https://www.exchangerate-api.com', terms: 'https://www.exchangerate-api.com/terms' }
const rates = (over: Partial<Rates> = {}): Rates => ({
  status: 'ok',
  base: 'USD',
  rates: { COP: 3179.863094, EUR: 0.86, MXN: 18.25, GBP: 0.75, CAD: 1.4, BRL: 5.04, CLP: 984.68, PEN: 3.4, ARS: 1528.26 },
  updated_at: '2026-10-24T00:02:31Z',
  source: SOURCE,
  fetched_at: '2026-10-24T12:00:00Z',
  age_seconds: 600,
  stale: false,
  message: null,
  ...over,
})

// Intl output uses non-breaking spaces; compare with plain ones.
const text = (pattern: string) => (content: string) => content.replace(/[\u00a0\u202f]/g, ' ').includes(pattern)

beforeEach(() => {
  vi.resetAllMocks()
  clearExternalCache()
})

describe('ConverterCalculator', () => {
  it('is the sixth tool, reachable with ?tool=converter', () => {
    expect(TOOLS.at(-1)).toEqual({ id: 'converter', label: 'Currency converter' })
    expect(parseTool('converter')).toBe('converter')
  })

  it('waits until its tab is opened before asking for rates', async () => {
    getUsdRates.mockResolvedValue(rates())
    const view = render(<ConverterCalculator currency="COP" active={false} />)
    expect(getUsdRates).not.toHaveBeenCalled()
    view.rerender(<ConverterCalculator currency="COP" active />)
    expect(await screen.findByText(text('$ 317.986 COP'))).toBeTruthy()
    expect(getUsdRates).toHaveBeenCalledTimes(1)
  })

  it('converts, shows the rate, its date and age, and swaps', async () => {
    getUsdRates.mockResolvedValue(rates())
    render(<ConverterCalculator currency="COP" active />)
    // 100 USD -> COP by default (the user's currency).
    expect(await screen.findByText(text('$ 317.986 COP'))).toBeTruthy()
    expect(screen.getByText('1 USD = 3,179.8631 COP')).toBeTruthy()
    expect(screen.getByText('Oct 24, 2026')).toBeTruthy()
    expect(screen.getByText('10 min ago')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1000000' } })
    fireEvent.click(screen.getByRole('button', { name: /Swap currencies/ }))
    expect((screen.getByLabelText('From') as HTMLSelectElement).value).toBe('COP')
    expect((screen.getByLabelText('To') as HTMLSelectElement).value).toBe('USD')
    expect(screen.getByText('$314.48 USD')).toBeTruthy()
    expect(screen.getByText('1 COP = 0.0003145 USD')).toBeTruthy()

    // A cross rate that doesn't involve the dollar.
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'EUR' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'COP' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } })
    expect(screen.getByText(text('$ 36.975 COP'))).toBeTruthy()
  })

  it('validates the amount inline', async () => {
    getUsdRates.mockResolvedValue(rates())
    render(<ConverterCalculator currency="COP" active />)
    await screen.findByText(text('$ 317.986 COP'))
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '-5' } })
    expect(screen.getByText("Can't be negative.")).toBeTruthy()
    expect(screen.getByText('Enter an amount to convert.')).toBeTruthy()
  })

  it('flags stale rates calmly and still converts', async () => {
    getUsdRates.mockResolvedValue(rates({ status: 'stale', stale: true, age_seconds: 7 * 3600 }))
    render(<ConverterCalculator currency="COP" active />)
    expect(await screen.findByText(text('$ 317.986 COP'))).toBeTruthy()
    expect(screen.getByText(/Showing the last known rates, updated 7 h ago/)).toBeTruthy()
  })

  it.each([
    ['off', 'External data is off.'],
    ['unavailable', 'Exchange rates are unavailable right now.'],
  ] as const)('shows one line when %s', async (status, message) => {
    getUsdRates.mockResolvedValue(rates({ status, rates: {}, updated_at: null, fetched_at: null, age_seconds: null }))
    render(<ConverterCalculator currency="COP" active />)
    expect(await screen.findByText(message)).toBeTruthy()
    expect(screen.queryByText(/ COP$/)).toBeNull()
  })

  it('keeps the attribution link the source asks for', async () => {
    getUsdRates.mockResolvedValue(rates())
    render(<ConverterCalculator currency="COP" active />)
    await act(async () => {})
    expect(screen.getByRole('link', { name: 'Rates By Exchange Rate API' }).getAttribute('href')).toBe('https://www.exchangerate-api.com')
  })
})
