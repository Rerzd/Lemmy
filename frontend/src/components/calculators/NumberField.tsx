import { useId } from 'react'
import { CircleAlert } from 'lucide-react'
import type { NumberFieldState } from '../../hooks/useNumberField'
import { inputClass, labelClass } from '../../lib/ui'

interface NumberFieldProps {
  label: string
  field: NumberFieldState
  prefix?: string // e.g. the currency code
  suffix?: string // e.g. "%"
  hint?: string
  optional?: boolean
  integer?: boolean
  placeholder?: string
}

// Number input with its error right below it, wired up with aria-invalid/describedby.
export function NumberField({ label, field, prefix, suffix, hint, optional, integer, placeholder }: NumberFieldProps) {
  const id = useId()
  // Only complain once something was typed; an untouched required field just waits.
  const showError = field.error !== null && field.raw.trim() !== ''
  const describedBy = [hint && `${id}-hint`, showError && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {optional && <span className="font-normal text-text-muted"> (optional)</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-medium text-text-muted" aria-hidden>
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode={integer ? 'numeric' : 'decimal'}
          min="0"
          step={integer ? 1 : 'any'}
          value={field.raw}
          onChange={(e) => field.setRaw(e.target.value)}
          placeholder={placeholder ?? '0'}
          aria-invalid={showError || undefined}
          aria-describedby={describedBy}
          className={`${inputClass} ${prefix ? 'pl-12' : ''} ${suffix ? 'pr-9' : ''} ${showError ? 'border-status-over focus:border-status-over focus:ring-status-over' : ''}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-muted" aria-hidden>
            {suffix}
          </span>
        )}
      </div>
      {hint && !showError && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-text-muted">
          {hint}
        </p>
      )}
      {showError && (
        <p id={`${id}-error`} className="mt-1 flex items-center gap-1 text-xs font-medium text-status-over">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {field.error}
        </p>
      )}
    </div>
  )
}
