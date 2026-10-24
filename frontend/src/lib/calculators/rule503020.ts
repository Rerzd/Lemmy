import { formatMoney, roundMoney } from '../money'

export interface IncomeSplit {
  needs: number
  wants: number
  savings: number
}

// 50 % needs, 30 % wants, 20 % savings. Savings takes the remainder after
// rounding, so the three parts always add up to the income exactly.
export function splitIncome(income: number, currency: string): IncomeSplit {
  const needs = roundMoney(income * 0.5, currency)
  const wants = roundMoney(income * 0.3, currency)
  return { needs, wants, savings: roundMoney(income - needs - wants, currency) }
}

export interface MonthData {
  fixed: number // this month's fixed spending (reports)
  savingsRate: number | null // this month's net / income as a ratio, null without income
  hasActivity: boolean
}

export interface RuleCheck {
  ok: boolean
  text: string
}

export interface RuleComparison {
  needs: RuleCheck | null
  savings: RuleCheck | null
  empty: string | null // shown instead of both when there's nothing to compare
}

const pct = (ratio: number) => `${Math.round(ratio * 100)}%`

/**
 * Plain-language check of a real month against the rule: fixed costs vs the 50 %
 * for needs (of the income entered), and the month's savings rate vs 20 %.
 */
export function compareWithRule(income: number, month: MonthData, currency: string): RuleComparison {
  if (!month.hasActivity) {
    return { needs: null, savings: null, empty: 'Nothing recorded this month yet, so there is nothing to compare.' }
  }
  const needsLimit = splitIncome(income, currency).needs
  const needs: RuleCheck | null =
    income > 0
      ? {
          ok: month.fixed <= needsLimit,
          text: `Fixed costs this month are ${formatMoney(month.fixed, currency)}, ${pct(month.fixed / income)} of your income: ${
            month.fixed <= needsLimit ? 'within' : 'above'
          } the 50% for needs.`,
        }
      : null
  const savings: RuleCheck =
    month.savingsRate === null
      ? { ok: false, text: 'No income recorded this month, so there is no savings rate to compare with the 20% goal.' }
      : month.savingsRate < 0
        ? { ok: false, text: `You spent more than you earned this month (${pct(month.savingsRate)}), so nothing went to savings yet.` }
        : {
            ok: month.savingsRate >= 0.2,
            text: `You saved ${pct(month.savingsRate)} of this month's income: ${month.savingsRate >= 0.2 ? 'at or above' : 'below'} the 20% goal.`,
          }
  return { needs, savings, empty: null }
}
