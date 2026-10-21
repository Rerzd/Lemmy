import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

interface ChangeBadgeProps {
  value: number | null
  // For expenses an increase is bad news, so the colors flip.
  upIsGood?: boolean
  suffix?: string
}

export function ChangeBadge({ value, upIsGood = true, suffix = '%' }: ChangeBadgeProps) {
  if (value === null || Math.abs(value) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-text-muted">
        <Minus className="size-3.5" aria-hidden />
        {value === null ? 'No prior data' : 'No change'}
      </span>
    )
  }
  const up = value > 0
  const good = up === upIsGood
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${good ? 'text-status-ok' : 'text-status-over'}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {up ? '+' : ''}
      {value.toFixed(1)}
      {suffix}
    </span>
  )
}
