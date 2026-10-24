import { roundMoney } from '../money'

export type ShoppingFrequency = 'weekly' | 'biweekly' | 'monthly'

// A year has 52 weeks and 365 days; spreading them over 12 months keeps every
// month the same size instead of pretending a month is exactly 4 weeks.
export const WEEKS_PER_MONTH = 52 / 12
export const DAYS_PER_MONTH = 365 / 12
export const SHOPS_PER_MONTH: Record<ShoppingFrequency, number> = {
  weekly: WEEKS_PER_MONTH,
  biweekly: WEEKS_PER_MONTH / 2,
  monthly: 1,
}

export interface GroceriesInput {
  people: number
  frequency: ShoppingFrequency
  budgetPerShop: number
  mealsOutPerWeek: number
  mealOutCost: number
}

export interface GroceriesPlan {
  groceriesMonthly: number
  groceriesWeekly: number
  perPersonMonthly: number
  perDay: number
  eatingOutMonthly: number
  totalMonthly: number
}

/**
 * Monthly food plan, rounded to the currency at the end. The two monthly parts
 * are rounded first and the total is their sum, so the total shown always equals
 * groceries + eating out as displayed; the per-week/person/day figures are views
 * of the groceries amount and are rounded on their own.
 */
export function planGroceries(input: GroceriesInput, currency: string): GroceriesPlan {
  const groceries = input.budgetPerShop * SHOPS_PER_MONTH[input.frequency]
  const eatingOut = input.mealsOutPerWeek * input.mealOutCost * WEEKS_PER_MONTH
  const groceriesMonthly = roundMoney(groceries, currency)
  const eatingOutMonthly = roundMoney(eatingOut, currency)
  return {
    groceriesMonthly,
    groceriesWeekly: roundMoney(groceries / WEEKS_PER_MONTH, currency),
    perPersonMonthly: roundMoney(groceries / input.people, currency),
    perDay: roundMoney(groceries / DAYS_PER_MONTH, currency),
    eatingOutMonthly,
    totalMonthly: roundMoney(groceriesMonthly + eatingOutMonthly, currency),
  }
}
