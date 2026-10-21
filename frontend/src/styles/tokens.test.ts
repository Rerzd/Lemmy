import { describe, expect, it } from 'vitest'
// Parse the two theme blocks straight from tokens.css, so the CSS itself is what's tested.
import css from './tokens.css?raw'

function themeTokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2].toLowerCase()]))
}

const THEMES = { light: themeTokens("[data-theme='light']"), dark: themeTokens("[data-theme='dark']") }

const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
function luminance(hex: string) {
  const [r, g, b] = hex.slice(1).match(/../g)!.map((h) => channel(parseInt(h, 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const SURFACES = ['bg', 'surface', 'surface-2']
const TEXT_ROLES = ['text', 'text-muted', 'primary-text', 'accent', 'income', 'expense', 'status-ok', 'status-warning', 'status-over']
const ON_FILL: [string, string][] = [
  ['primary-contrast', 'primary'],
  ['primary-contrast', 'primary-hover'],
  ['danger-contrast', 'danger'],
  ['danger-contrast', 'danger-hover'],
  ['ink', 'highlight'],
]
// Non-text: input outlines, focus rings, progress bars and chart marks need 3:1.
const NON_TEXT: [string, string][] = [
  ['border-strong', 'bg'],
  ['border-strong', 'surface'],
  ['primary', 'bg'],
  ['primary', 'surface'],
  ['status-ok', 'surface-2'],
  ['status-warning', 'surface-2'],
  ['status-over', 'surface-2'],
  ...['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-6'].map((c): [string, string] => [c, 'surface']),
]

describe.each(Object.entries(THEMES))('%s theme', (_, t) => {
  it('defines every role', () => {
    for (const role of [...SURFACES, ...TEXT_ROLES, 'border', 'primary', 'highlight', 'ink', 'danger']) expect(t[role], role).toMatch(/^#/)
  })

  it.each(TEXT_ROLES)('%s text is AA (4.5:1) on every surface', (role) => {
    for (const bg of SURFACES) expect(contrast(t[role], t[bg]), `${role} on ${bg}`).toBeGreaterThanOrEqual(4.5)
  })

  it.each(ON_FILL)('%s on %s is AA', (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(NON_TEXT)('%s against %s is at least 3:1', (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(3)
  })
})
