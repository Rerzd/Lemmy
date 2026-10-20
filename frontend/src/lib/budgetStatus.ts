import { CircleAlert, CircleCheck, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { BudgetHealth } from '../types/api'

// Status colors are reserved for budget health and always ship with an icon and a label.
export const BUDGET_STATUS: Record<BudgetHealth, { label: string; bar: string; text: string; icon: LucideIcon }> = {
  ok: { label: 'On track', bar: 'bg-emerald-500', text: 'text-emerald-400', icon: CircleCheck },
  warning: { label: 'Close to limit', bar: 'bg-amber-400', text: 'text-amber-300', icon: TriangleAlert },
  over: { label: 'Over budget', bar: 'bg-rose-500', text: 'text-rose-400', icon: CircleAlert },
}
