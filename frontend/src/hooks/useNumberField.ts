import { useState } from 'react'
import { parseField, type FieldRule } from '../lib/calculators/input'

// Keeps what the user typed (so "1." or "" survive re-renders) plus its parsed value or error.
export function useNumberField(initial: string, rule: FieldRule) {
  const [raw, setRaw] = useState(initial)
  return { raw, setRaw, ...parseField(raw, rule) }
}

export type NumberFieldState = ReturnType<typeof useNumberField>
