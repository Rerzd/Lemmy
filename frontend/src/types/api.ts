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
}

export interface CategoryPayload {
  name: string
  type: TxType
  color: string
  icon: string
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
