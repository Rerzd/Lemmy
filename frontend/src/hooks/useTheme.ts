import { useMemo, useSyncExternalStore } from 'react'
import { getThemeStore, readTokens, type ThemePreference } from '../lib/theme'

export function useTheme() {
  const store = getThemeStore()
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return { ...state, setPreference: (preference: ThemePreference) => store.setPreference(preference) }
}

const CHART_TOKENS = ['chart-1', 'chart-2', 'border', 'text-muted', 'surface', 'surface-2'] as const

// Chart libraries draw SVG with literal colors, so read the tokens and re-read on theme change.
export function useChartColors() {
  const { resolved } = useTheme()
  return useMemo(() => {
    const t = readTokens(CHART_TOKENS)
    return {
      theme: resolved,
      income: t['chart-1'],
      expense: t['chart-2'],
      grid: t.border,
      axis: t['text-muted'],
      surface: t.surface,
      cursor: t['surface-2'],
    }
  }, [resolved])
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia?.(REDUCED_MOTION)
  media?.addEventListener('change', onChange)
  return () => media?.removeEventListener('change', onChange)
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia?.(REDUCED_MOTION).matches ?? false)
}
