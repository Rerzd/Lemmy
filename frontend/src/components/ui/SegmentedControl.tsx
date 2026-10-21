interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}

// Pill-style toggle for a small set of exclusive choices (All / Income / Expense).
// 50px with 2px padding leaves 44px segments on phones; compact from sm up.
export function SegmentedControl<T extends string>({ label, value, options, onChange, className = '' }: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex h-[50px] rounded-control border border-border bg-bg p-0.5 sm:h-10 sm:p-1 ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-chip px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
              selected ? 'bg-surface font-semibold text-text shadow-raised ring-1 ring-border-strong' : 'text-text-muted hover:text-text'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
