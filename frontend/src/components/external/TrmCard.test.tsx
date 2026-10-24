import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearExternalCache } from '../../hooks/useExternal'
import type { ExternalSource, Trm } from '../../types/api'
import { TrmCard } from './TrmCard'

vi.mock('../../api/external', () => ({ getTrm: vi.fn() }))
const external = await import('../../api/external')
const getTrm = vi.mocked(external.getTrm)

const SOURCE: ExternalSource = { id: 'trm', name: 'TRM', url: 'https://www.datos.gov.co/d/32sa-8pi3', terms: 'CC BY-SA 4.0' }
const trm = (over: Partial<Trm> = {}): Trm => ({
  status: 'ok',
  date: '2026-10-24',
  value: 3158.43,
  valid_from: '2026-10-24',
  valid_to: '2026-10-26',
  source: SOURCE,
  fetched_at: '2026-10-24T12:00:00Z',
  age_seconds: 3 * 3600,
  stale: false,
  message: null,
  ...over,
})
const EMPTY = { value: null, valid_from: null, valid_to: null, fetched_at: null, age_seconds: null }
// Intl output uses non-breaking spaces; compare with plain ones.
const text = (pattern: string) => (content: string) => content.replace(/[\u00a0\u202f]/g, ' ').includes(pattern)

beforeEach(() => {
  vi.resetAllMocks()
  clearExternalCache()
})
afterEach(() => vi.useRealTimers())

describe('TrmCard', () => {
  it('shows a skeleton while loading', () => {
    getTrm.mockReturnValue(new Promise(() => {}))
    render(<TrmCard />)
    expect(screen.getByRole('status', { name: 'Loading the dollar rate' })).toBeTruthy()
  })

  it('shows the value, its validity and a quiet age note', async () => {
    getTrm.mockResolvedValue(trm())
    render(<TrmCard />)
    expect(await screen.findByText(text('$ 3.158,43'))).toBeTruthy()
    expect(screen.getByText(/COP per US dollar · Valid Oct 24 – Oct 26, 2026/)).toBeTruthy()
    expect(screen.getByText(/Updated 3 h ago/)).toBeTruthy()
    expect(screen.queryByText(/last known/)).toBeNull()
  })

  it('keeps the value but says it is the last known one when stale', async () => {
    getTrm.mockResolvedValue(trm({ status: 'stale', stale: true, age_seconds: 26 * 3600 }))
    render(<TrmCard />)
    expect(await screen.findByText(text('$ 3.158,43'))).toBeTruthy()
    expect(screen.getByText(/Showing the last known value, updated 1 day ago/)).toBeTruthy()
    expect(screen.queryByText(/^Updated/)).toBeNull()
  })

  it('shows one line, with a retry, when unavailable', async () => {
    getTrm.mockResolvedValueOnce(trm({ status: 'unavailable', ...EMPTY })).mockResolvedValueOnce(trm())
    render(<TrmCard />)
    expect(await screen.findByText('The dollar rate is unavailable right now.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(text('$ 3.158,43'))).toBeTruthy()
    expect(getTrm).toHaveBeenCalledTimes(2)
  })

  it('treats a failed request like an unavailable source', async () => {
    getTrm.mockRejectedValue(new Error('Network Error'))
    render(<TrmCard />)
    expect(await screen.findByText('The dollar rate is unavailable right now.')).toBeTruthy()
  })

  it('says external data is off, without a retry', async () => {
    getTrm.mockResolvedValue(trm({ status: 'off', ...EMPTY, message: 'External data is off.' }))
    render(<TrmCard />)
    expect(await screen.findByText('External data is off.')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('reuses the answer instead of asking again (e.g. after switching months)', async () => {
    getTrm.mockResolvedValue(trm())
    const first = render(<TrmCard />)
    await screen.findByText(text('$ 3.158,43'))
    first.unmount()
    render(<TrmCard />)
    // Straight from the cache: no skeleton and no second request.
    expect(screen.getByText(text('$ 3.158,43'))).toBeTruthy()
    expect(getTrm).toHaveBeenCalledTimes(1)
  })

  it('asks again once the client cache expires', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    getTrm.mockResolvedValue(trm())
    const first = render(<TrmCard />)
    await screen.findByText(text('$ 3.158,43'))
    first.unmount()
    vi.setSystemTime(Date.now() + 11 * 60_000)
    render(<TrmCard />)
    await waitFor(() => expect(getTrm).toHaveBeenCalledTimes(2))
  })
})
