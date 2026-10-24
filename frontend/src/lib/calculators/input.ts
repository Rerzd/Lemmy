// Turns a raw input string into a number or a message the form can show inline.

export interface FieldRule {
  min?: number
  max?: number
  integer?: boolean
  // Optional fields treat an empty input as this value instead of an error.
  emptyValue?: number
}

export type Parsed = { value: number; error: null } | { value: null; error: string }

const fmt = (n: number) => n.toLocaleString('en-US')

export function parseField(raw: string, rule: FieldRule = {}): Parsed {
  const text = raw.trim()
  if (text === '') {
    return rule.emptyValue !== undefined ? { value: rule.emptyValue, error: null } : { value: null, error: 'Required.' }
  }
  const value = Number(text)
  if (!Number.isFinite(value)) return { value: null, error: 'Enter a number.' }
  if (value < 0) return { value: null, error: "Can't be negative." }
  if (rule.integer && !Number.isInteger(value)) return { value: null, error: 'Use a whole number.' }
  if (rule.min !== undefined && value < rule.min) return { value: null, error: `Must be at least ${fmt(rule.min)}.` }
  if (rule.max !== undefined && value > rule.max) return { value: null, error: `Must be at most ${fmt(rule.max)}.` }
  return { value, error: null }
}

// Shared limits, so every calculator rejects the same nonsense the same way.
export const LIMITS = {
  // Covers large peso amounts with room to spare.
  money: { min: 0, max: 1_000_000_000_000 },
  percent: { min: 0, max: 100 },
  months: { min: 1, max: 600, integer: true },
  years: { min: 1, max: 50, integer: true },
} as const
