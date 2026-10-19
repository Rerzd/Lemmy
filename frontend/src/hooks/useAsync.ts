import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { getErrorMessage } from '../lib/errors'

interface AsyncState<T> {
  key: string | null
  data: T | null
  error: string | null
}

/**
 * Tiny data-fetching hook: runs `fetcher` whenever `key` changes (or on reload())
 * and exposes { data, error, loading }. Previous data stays visible while a new
 * request is in flight, so screens only show skeletons on the first load.
 */
export function useAsync<T>(fetcher: () => Promise<T>, key: string) {
  const [nonce, setNonce] = useState(0)
  const requestKey = `${key}#${nonce}`
  const [state, setState] = useState<AsyncState<T>>({ key: null, data: null, error: null })

  // useEffectEvent always sees the latest fetcher without re-running the effect.
  const run = useEffectEvent(() => fetcher())

  useEffect(() => {
    let cancelled = false
    run().then(
      (data) => {
        if (!cancelled) setState({ key: requestKey, data, error: null })
      },
      (error: unknown) => {
        if (!cancelled) setState((prev) => ({ key: requestKey, data: prev.data, error: getErrorMessage(error) }))
      },
    )
    // Ignore responses that arrive after the inputs changed again.
    return () => {
      cancelled = true
    }
  }, [requestKey])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data: state.data, error: state.error, loading: state.key !== requestKey, reload }
}
