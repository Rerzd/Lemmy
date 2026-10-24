import { api } from './client'
import type { Rates, Trm } from '../types/api'

// Both endpoints answer 200 with a status (ok, stale, unavailable, off); the server does
// the outgoing calls and the caching, the browser only ever talks to our API.
export async function getTrm(): Promise<Trm> {
  const { data } = await api.get<Trm>('/external/trm')
  return data
}

// Every supported currency against USD in one request; cross rates are computed locally.
export async function getUsdRates(): Promise<Rates> {
  const { data } = await api.get<Rates>('/external/rates', { params: { base: 'USD' } })
  return data
}
