export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeState {
  preference: ThemePreference
  resolved: ResolvedTheme
}

// Keep in sync with the inline script in index.html, which applies the theme before first paint.
export const THEME_STORAGE_KEY = 'lemmy-theme'
export const DARK_QUERY = '(prefers-color-scheme: dark)'
export const THEME_PREFERENCES: ThemePreference[] = ['light', 'dark', 'system']

export function parsePreference(value: unknown): ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference) ? (value as ThemePreference) : 'system'
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

// Storage can be missing or throw (private mode, blocked site data); the app must still work.
export function readPreference(storage: Pick<Storage, 'getItem'> | null): ThemePreference {
  try {
    return parsePreference(storage?.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

export function savePreference(storage: Pick<Storage, 'setItem' | 'removeItem'> | null, preference: ThemePreference) {
  try {
    // "system" is the default, so it doesn't need to be stored.
    if (preference === 'system') storage?.removeItem(THEME_STORAGE_KEY)
    else storage?.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // The choice still applies for this visit.
  }
}

export function applyTheme(root: HTMLElement, resolved: ResolvedTheme) {
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
}

interface ThemeStoreDeps {
  storage: Storage | null
  media: MediaQueryList | null
  root: HTMLElement
}

/**
 * Holds the preference, follows the OS setting while it is "system", and keeps
 * data-theme on <html> up to date. Shaped for useSyncExternalStore.
 */
export function createThemeStore({ storage, media, root }: ThemeStoreDeps) {
  const listeners = new Set<() => void>()
  let preference = readPreference(storage)
  let state: ThemeState = { preference, resolved: resolveTheme(preference, media?.matches ?? false) }

  const update = () => {
    const resolved = resolveTheme(preference, media?.matches ?? false)
    if (state.preference !== preference || state.resolved !== resolved) {
      state = { preference, resolved }
      applyTheme(root, resolved)
      listeners.forEach((listener) => listener())
    }
  }

  applyTheme(root, state.resolved)
  media?.addEventListener('change', update)

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setPreference(next: ThemePreference) {
      preference = next
      savePreference(storage, next)
      update()
    },
  }
}

export type ThemeStore = ReturnType<typeof createThemeStore>

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

let store: ThemeStore | null = null

export function getThemeStore(): ThemeStore {
  store ??= createThemeStore({
    storage: safeLocalStorage(),
    media: typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null,
    root: document.documentElement,
  })
  return store
}

// Reads the current value of each token from <html>, e.g. for chart fills.
export function readTokens<K extends string>(names: readonly K[], root: HTMLElement = document.documentElement): Record<K, string> {
  const style = getComputedStyle(root)
  return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(`--${name}`).trim()])) as Record<K, string>
}
