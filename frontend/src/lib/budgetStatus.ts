import { CircleAlert, CircleCheck, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { BudgetHealth } from '../types/api'

// Status colors are reserved for budget health and always ship with an icon and a label.
export const BUDGET_STATUS: Record<BudgetHealth, { label: string; bar: string; text: string; icon: LucideIcon }> = {
  ok: { label: 'On track', bar: 'bg-status-ok', text: 'text-status-ok', icon: CircleCheck },
  warning: { label: 'Close to limit', bar: 'bg-status-warning', text: 'text-status-warning', icon: TriangleAlert },
  over: { label: 'Over budget', bar: 'bg-status-over', text: 'text-status-over', icon: CircleAlert },
}
