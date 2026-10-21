import { beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY, createThemeStore, parsePreference, readPreference, resolveTheme } from './theme'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void data.set(key, value)),
    removeItem: vi.fn((key: string) => void data.delete(key)),
    data,
  } as unknown as Storage & { data: Map<string, string> }
}

// A controllable prefers-color-scheme: dark media query.
function fakeMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  return {
    matches,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    setSystemDark(dark: boolean) {
      this.matches = dark
      listeners.forEach((fn) => fn())
    },
  }
}

function setup(stored: Record<string, string> = {}, systemDark = false) {
  const storage = memoryStorage(stored)
  const media = fakeMedia(systemDark)
  const root = document.createElement('html')
  const store = createThemeStore({ storage, media: media as unknown as MediaQueryList, root })
  return { storage, media, root, store }
}

describe('theme preference', () => {
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    ['system', 'system'],
    ['purple', 'system'],
    ['', 'system'],
    [null, 'system'],
  ])('parses %j as %s', (value, expected) => {
    expect(parsePreference(value)).toBe(expected)
  })

  it('resolves "system" from the OS setting', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('falls back to "system" when storage throws', () => {
    const storage = { getItem: () => { throw new Error('blocked') } }
    expect(readPreference(storage)).toBe('system')
    expect(readPreference(null)).toBe('system')
  })
})

describe('theme store', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('follows the system by default', () => {
    const { store, root } = setup({}, true)
    expect(store.getSnapshot()).toEqual({ preference: 'system', resolved: 'dark' })
    expect(root.dataset.theme).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
  })

  it('uses a saved choice over the system setting', () => {
    const { store, root } = setup({ [THEME_STORAGE_KEY]: 'light' }, true)
    expect(store.getSnapshot()).toEqual({ preference: 'light', resolved: 'light' })
    expect(root.dataset.theme).toBe('light')
  })

  it('ignores an invalid stored value', () => {
    const { store } = setup({ [THEME_STORAGE_KEY]: 'neon' }, false)
    expect(store.getSnapshot()).toEqual({ preference: 'system', resolved: 'light' })
  })

  it('reacts to OS changes only while on "system"', () => {
    const { store, media, root } = setup({}, false)
    const listener = vi.fn()
    store.subscribe(listener)

    media.setSystemDark(true)
    expect(store.getSnapshot().resolved).toBe('dark')
    expect(root.dataset.theme).toBe('dark')
    expect(listener).toHaveBeenCalledTimes(1)

    store.setPreference('light')
    media.setSystemDark(false)
    media.setSystemDark(true)
    expect(store.getSnapshot()).toEqual({ preference: 'light', resolved: 'light' })
  })

  it('persists explicit choices and clears the key for "system"', () => {
    const { store, storage } = setup()
    store.setPreference('dark')
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe('dark')
    store.setPreference('system')
    expect(storage.data.has(THEME_STORAGE_KEY)).toBe(false)
  })

  it('still switches when storage cannot be written', () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new Error('quota') },
      removeItem: () => { throw new Error('quota') },
    } as unknown as Storage
    const root = document.createElement('html')
    const store = createThemeStore({ storage, media: null, root })
    store.setPreference('dark')
    expect(root.dataset.theme).toBe('dark')
  })
})
