import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { getErrorMessage } from '../lib/errors'
import type { ExternalState } from '../types/api'

// The server already caches the sources for hours; the browser keeps answers for a few
// minutes so switching months or pages doesn't ask again. Answers that aren't "ok" are
// kept briefly, so a recovered source shows up soon.
export const CLIENT_TTL_MS = 10 * 60_000
export const CLIENT_RETRY_MS = 60_000

interface Entry {
  at: number
  data?: { status: ExternalState }
  promise?: Promise<{ status: ExternalState }>
}

const cache = new Map<string, Entry>()

export function clearExternalCache() {
  cache.clear()
}

function freshEntry(key: string, now = Date.now()): Entry | null {
  const hit = cache.get(key)
  if (!hit?.data) return null
  const ttl = hit.data.status === 'ok' ? CLIENT_TTL_MS : CLIENT_RETRY_MS
  return now - hit.at < ttl ? hit : null
}

function load<T extends { status: ExternalState }>(key: string, fetcher: () => Promise<T>, force: boolean): Promise<Entry> {
  const hit = cache.get(key)
  if (!force) {
    const fresh = freshEntry(key)
    if (fresh) return Promise.resolve(fresh)
    // Two cards asking at once share one request.
    if (hit?.promise) return hit.promise.then(() => cache.get(key)!)
  }
  const promise = fetcher().then(
    (data) => {
      cache.set(key, { at: Date.now(), data })
      return data
    },
    (error: unknown) => {
      cache.delete(key)
      throw error
    },
  )
  cache.set(key, { ...hit, at: hit?.at ?? 0, promise })
  return promise.then(() => cache.get(key)!)
}

interface State<T> {
  data: T | null
  receivedAt: number
  error: string | null
}

/**
 * Loads one external resource (TRM, rates) through the client cache. Pass enabled=false
 * to wait until it's needed (the converter only asks once its tab is opened).
 */
export function useExternal<T extends { status: ExternalState }>(key: string, fetcher: () => Promise<T>, enabled = true) {
  const [state, setState] = useState<State<T>>(() => {
    const hit = freshEntry(key)
    return { data: (hit?.data as T) ?? null, receivedAt: hit?.at ?? 0, error: null }
  })
  const [nonce, setNonce] = useState(0)
  const run = useEffectEvent((force: boolean) => load(key, fetcher, force))

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    run(nonce > 0).then(
      (entry) => {
        if (!cancelled) setState({ data: entry.data as T, receivedAt: entry.at, error: null })
      },
      (error: unknown) => {
        if (!cancelled) setState((prev) => ({ ...prev, error: getErrorMessage(error) }))
      },
    )
    return () => {
      cancelled = true
    }
  }, [key, enabled, nonce])

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
    setNonce((n) => n + 1)
  }, [])

  return { ...state, loading: enabled && state.data === null && state.error === null, reload }
}
