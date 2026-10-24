import { shiftMonth, type YearMonth } from '../dates'
import { roundMoney } from '../money'
import { monthlyFromEffectiveAnnual } from './rates'

export interface SavingsGoalInput {
  target: number
  current: number
  months: number
  yearlyReturn: number // effective annual, as a percent (6 = 6 % EA)
}

export type SavingsGoalResult =
  | { kind: 'reached' } // current savings already cover the target
  | { kind: 'growth'; months: number; reachedOn: YearMonth } // returns alone get there in time
  | { kind: 'contribute'; monthly: number; totalContributed: number; growth: number; reachedOn: YearMonth }

/**
 * Monthly contribution so that current savings plus deposits at the end of each
 * month, growing at the monthly equivalent of the yearly return, reach the target
 * in `months`. FV = S·(1+m)^n + C·((1+m)^n − 1)/m, solved for C; with m = 0 it's
 * simply (target − current) / n, so a 0 % return never divides by zero.
 */
export function planSavingsGoal(input: SavingsGoalInput, today: Date, currency: string): SavingsGoalResult {
  const { target, current, months } = input
  if (current >= target) return { kind: 'reached' }

  const m = monthlyFromEffectiveAnnual(input.yearlyReturn / 100)
  const thisMonth = { year: today.getFullYear(), month: today.getMonth() + 1 }
  const factor = Math.pow(1 + m, months)
  const grown = current * factor

  if (m > 0 && grown >= target) {
    // First month in which compounding alone crosses the target.
    const needed = Math.ceil(Math.log(target / current) / Math.log(1 + m) - 1e-9)
    return { kind: 'growth', months: needed, reachedOn: shiftMonth(thisMonth, needed) }
  }

  const exact = m === 0 ? (target - current) / months : ((target - grown) * m) / (factor - 1)
  const monthly = roundMoney(exact, currency)
  const totalContributed = roundMoney(monthly * months, currency)
  return {
    kind: 'contribute',
    monthly,
    totalContributed,
    // Whatever the deposits and starting savings don't cover comes from returns.
    growth: roundMoney(Math.max(0, target - current - totalContributed), currency),
    reachedOn: shiftMonth(thisMonth, months),
  }
}
