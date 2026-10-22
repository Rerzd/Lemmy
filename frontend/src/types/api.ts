// These types mirror the Pydantic schemas in backend/app/schemas/.
// Keeping them in sync gives us autocomplete + compile-time safety.

export type TxType = 'income' | 'expense'

export interface Category {
  id: number
  user_id: number
  name: string
  type: TxType
  color: string
  icon: string
  // Fixed monthly cost (rent, utilities...); only expense categories can be fixed.
  is_fixed: boolean
}

export interface CategoryPayload {
  name: string
  type: TxType
  color: string
  icon: string
  is_fixed: boolean
}

export interface Transaction {
  id: number
  user_id: number
  category_id: number
  amount: number
  currency: string
  type: TxType
  description: string | null
  date: string // YYYY-MM-DD
}

export interface TransactionPayload {
  category_id: number
  amount: number
  type: TxType
  description: string | null
  date: string
}

export interface TransactionFilters {
  type?: TxType
  category_id?: number
  q?: string
  month?: number
  year?: number
  limit?: number
  offset?: number
}

// GET /transactions returns a plain list; the total comes in X-Total-Count.
export interface Page<T> {
  items: T[]
  total: number
}

export interface Budget {
  id: number
  user_id: number
  category_id: number
  amount: number
  currency: string
  month: number
  year: number
}

export interface BudgetPayload {
  category_id: number
  amount: number
  month: number
  year: number
}

export interface PeriodTotals {
  income: number
  expense: number
  net: number
}

export interface Overview extends PeriodTotals {
  month: number
  year: number
  savings_rate: number | null // ratio: 0.25 = 25 %
  transaction_count: number
  previous: PeriodTotals
  change_pct: { income: number | null; expense: number | null; net: number | null } // percent
}

export interface CategoryTotal {
  category_id: number
  name: string
  color: string
  icon: string
  total: number
  share: number // ratio 0..1
  count: number
}

export interface TrendPoint extends PeriodTotals {
  year: number
  month: number
}

export type BudgetHealth = 'ok' | 'warning' | 'over'

export interface BudgetStatus {
  budget_id: number
  category_id: number
  name: string
  color: string
  icon: string
  budgeted: number
  spent: number
  remaining: number
  pct_used: number // percent: 85 = 85 %
  status: BudgetHealth
}

// /reports: *_share fields are ratios (0..1), *_pct fields are percents.
export interface CostSplit {
  fixed: number
  variable: number
  total: number
  fixed_share: number | null
}

export interface LivingCostCategory {
  category_id: number
  name: string
  color: string
  icon: string
  is_fixed: boolean
  this_month: number
  baseline: number | null // average per month; null without history
  change_pct: number | null
}

export interface LivingCosts {
  month: string // YYYY-MM
  months_used: number // 0..3 complete months averaged
  baseline_months: string[]
  this_month: CostSplit
  baseline: CostSplit | null
  min_monthly_income: number | null
  savings: number
  cushion_months: number | null
  categories: LivingCostCategory[]
}

export interface CategorySpending {
  months: string[]
  categories: (Omit<LivingCostCategory, 'this_month' | 'baseline' | 'change_pct'> & { totals: number[]; total: number })[]
  totals: number[]
}
