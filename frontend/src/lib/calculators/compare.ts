import type { BudgetHealth } from '../../types/api'

export type PlanStatus = 'under' | 'close' | 'over'

// Same thresholds as budgets (80 % and 100 %), so "close" means the same everywhere.
export const PLAN_STATUS: Record<PlanStatus, { label: string; health: BudgetHealth }> = {
  under: { label: 'Under plan', health: 'ok' },
  close: { label: 'Close to plan', health: 'warning' },
  over: { label: 'Over plan', health: 'over' },
}

export interface PlanComparison {
  status: PlanStatus
  pct: number // actual as a percent of the plan
  difference: number // plan - actual; negative when over
}

export function comparePlan(planned: number, actual: number): PlanComparison | null {
  if (planned <= 0) return null
  const pct = (actual / planned) * 100
  const status: PlanStatus = pct < 80 ? 'under' : pct <= 100 ? 'close' : 'over'
  return { status, pct, difference: planned - actual }
}
