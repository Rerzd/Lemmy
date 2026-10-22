import { Lock, Shuffle } from 'lucide-react'
import { COST_KIND } from '../../lib/reports'

// Inline "Fixed" / "Variable" label: icon plus text, never just a color.
export function CostKind({ fixed }: { fixed: boolean }) {
  const Icon = fixed ? Lock : Shuffle
  return (
    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
      <Icon className="size-3" aria-hidden />
      {COST_KIND[fixed ? 'fixed' : 'variable'].label}
    </span>
  )
}
