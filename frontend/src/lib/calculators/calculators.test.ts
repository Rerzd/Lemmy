// Reference numbers come from an independent Python `decimal` script (50-digit
// precision, ROUND_HALF_UP) using the textbook formulas, not a port of this code.
import { describe, expect, it } from 'vitest'
import { comparePlan } from './compare'
import { growCompound } from './compound'
import { planGroceries } from './groceries'
import { LIMITS, parseField } from './input'
import { amortize } from './loan'
import { monthlyFromEffectiveAnnual } from './rates'
import { compareWithRule, splitIncome } from './rule503020'
import { planSavingsGoal } from './savingsGoal'

const TODAY = new Date(2026, 9, 23) // 23 Oct 2026

describe('parseField', () => {
  it('accepts valid numbers and optional blanks', () => {
    expect(parseField('250000', LIMITS.money)).toEqual({ value: 250000, error: null })
    expect(parseField(' 12.5 ', LIMITS.percent)).toEqual({ value: 12.5, error: null })
    expect(parseField('', { emptyValue: 0 })).toEqual({ value: 0, error: null })
  })

  it.each([
    ['', {}, 'Required.'],
    ['abc', {}, 'Enter a number.'],
    ['-5', LIMITS.money, "Can't be negative."],
    ['1.5', LIMITS.months, 'Use a whole number.'],
    ['0', LIMITS.months, 'Must be at least 1.'],
    ['601', LIMITS.months, 'Must be at most 600.'],
    ['101', LIMITS.percent, 'Must be at most 100.'],
    ['2000000000000', LIMITS.money, 'Must be at most 1,000,000,000,000.'],
  ])('%j -> %s', (raw, rule, error) => {
    expect(parseField(raw, rule)).toEqual({ value: null, error })
  })
})

describe('monthlyFromEffectiveAnnual', () => {
  it('compounds back to the annual rate', () => {
    const m = monthlyFromEffectiveAnnual(0.24)
    expect(m).toBeCloseTo(0.0180875824835, 12)
    expect(Math.pow(1 + m, 12)).toBeCloseTo(1.24, 12)
    expect(monthlyFromEffectiveAnnual(0)).toBe(0)
  })
})

describe('planGroceries', () => {
  const base = { people: 2, frequency: 'weekly' as const, budgetPerShop: 250_000, mealsOutPerWeek: 2, mealOutCost: 40_000 }

  it('matches the hand-computed plan', () => {
    expect(planGroceries(base, 'COP')).toEqual({
      groceriesMonthly: 1_083_333,
      groceriesWeekly: 250_000,
      perPersonMonthly: 541_667,
      perDay: 35_616,
      eatingOutMonthly: 346_667,
      totalMonthly: 1_430_000,
    })
  })

  it('handles other frequencies and no eating out', () => {
    expect(planGroceries({ ...base, frequency: 'biweekly', mealsOutPerWeek: 0 }, 'COP')).toMatchObject({
      groceriesMonthly: 541_667,
      eatingOutMonthly: 0,
      totalMonthly: 541_667,
    })
    expect(planGroceries({ ...base, frequency: 'monthly', people: 1 }, 'COP').groceriesMonthly).toBe(250_000)
  })

  it('keeps the total equal to its displayed parts in cents', () => {
    const plan = planGroceries({ people: 3, frequency: 'weekly', budgetPerShop: 100.1, mealsOutPerWeek: 3, mealOutCost: 12.35 }, 'USD')
    expect(plan.groceriesMonthly).toBe(433.77)
    expect(plan.eatingOutMonthly).toBe(160.55)
    expect(plan.totalMonthly).toBe(594.32)
  })
})

describe('comparePlan', () => {
  it.each([
    [1000, 500, 'under'],
    [1000, 800, 'close'],
    [1000, 1000, 'close'],
    [1000, 1001, 'over'],
    [1000, 0, 'under'],
  ])('plan %s, actual %s -> %s', (planned, actual, status) => {
    expect(comparePlan(planned, actual)?.status).toBe(status)
  })

  it('reports the difference and refuses an empty plan', () => {
    expect(comparePlan(1000, 1200)).toEqual({ status: 'over', pct: 120, difference: -200 })
    expect(comparePlan(0, 100)).toBeNull()
  })
})

describe('planSavingsGoal', () => {
  const goal = { target: 20_000_000, current: 2_000_000, months: 24, yearlyReturn: 0 }

  it('splits the gap evenly at 0% (no division by zero)', () => {
    expect(planSavingsGoal(goal, TODAY, 'COP')).toEqual({
      kind: 'contribute',
      monthly: 750_000,
      totalContributed: 18_000_000,
      growth: 0,
      reachedOn: { year: 2028, month: 10 },
    })
  })

  it('needs less each month with a yearly return', () => {
    expect(planSavingsGoal({ ...goal, yearlyReturn: 6 }, TODAY, 'COP')).toEqual({
      kind: 'contribute',
      monthly: 699_131,
      totalContributed: 16_779_144,
      growth: 1_220_856,
      reachedOn: { year: 2028, month: 10 },
    })
  })

  it('recognizes goals already reached or reached by returns alone', () => {
    expect(planSavingsGoal({ ...goal, current: 20_000_000 }, TODAY, 'COP')).toEqual({ kind: 'reached' })
    expect(planSavingsGoal({ ...goal, current: 25_000_000 }, TODAY, 'COP')).toEqual({ kind: 'reached' })
    expect(planSavingsGoal({ target: 1_100_000, current: 1_000_000, months: 24, yearlyReturn: 12 }, TODAY, 'COP')).toEqual({
      kind: 'growth',
      months: 11,
      reachedOn: { year: 2027, month: 9 },
    })
  })

  it('works from zero savings', () => {
    const result = planSavingsGoal({ target: 1200, current: 0, months: 12, yearlyReturn: 0 }, TODAY, 'USD')
    expect(result).toMatchObject({ kind: 'contribute', monthly: 100 })
  })
})

describe('growCompound', () => {
  // Reference values: closed form B = P(1+m)^n + d((1+m)^n - 1)/m with m = 1.12^(1/12) - 1,
  // computed with Python decimal at 50 digits and rounded half up.
  it('matches the closed form after 10 years at 12% EA', () => {
    const result = growCompound({ initial: 1_000_000, monthly: 100_000, yearlyRate: 12, years: 10 }, 'COP')
    expect(result.finalBalance).toBe(25_298_852)
    expect(result.totalContributed).toBe(13_000_000)
    expect(result.interestEarned).toBe(12_298_852)
    expect(result.years).toHaveLength(10)
    expect(result.years[0]).toEqual({ year: 1, contributed: 2_200_000, interest: 184_650, balance: 2_384_650 })
  })

  it('gives back exactly the yearly rate, handles cents, a 0% rate and no deposits', () => {
    const plain = growCompound({ initial: 1000, monthly: 0, yearlyRate: 5, years: 2 }, 'USD')
    expect(plain.years.map((y) => y.balance)).toEqual([1050, 1102.5])
    expect(growCompound({ initial: 500, monthly: 100, yearlyRate: 0, years: 2 }, 'USD')).toMatchObject({
      finalBalance: 2900,
      totalContributed: 2900,
      interestEarned: 0,
    })
  })

  it('always adds up: contributed + interest = balance', () => {
    for (const row of growCompound({ initial: 333.33, monthly: 77.77, yearlyRate: 7.3, years: 5 }, 'USD').years) {
      expect(Math.round((row.contributed + row.interest) * 100)).toBe(Math.round(row.balance * 100))
    }
  })
})

describe('amortize', () => {
  it('matches the reference loan: 10,000,000 at 24% EA over 12 months', () => {
    const loan = amortize({ amount: 10_000_000, effectiveAnnualRate: 24, months: 12 }, 'COP')
    expect(loan.payment).toBe(934_525)
    expect(loan.rows[0]).toEqual({ month: 1, payment: 934_525, interest: 180_876, principal: 753_649, balance: 9_246_351 })
    expect(loan.rows[1]).toEqual({ month: 2, payment: 934_525, interest: 167_244, principal: 767_281, balance: 8_479_070 })
    // The last row absorbs the rounding and closes the loan at exactly 0.
    expect(loan.rows[11]).toEqual({ month: 12, payment: 934_527, interest: 16_603, principal: 917_924, balance: 0 })
    expect(loan.totalInterest).toBe(1_214_302)
    expect(loan.totalPaid).toBe(11_214_302)
  })

  it('handles a 0% rate without dividing by zero', () => {
    const loan = amortize({ amount: 1200, effectiveAnnualRate: 0, months: 12 }, 'USD')
    expect(loan.payment).toBe(100)
    expect(loan.totalInterest).toBe(0)
    expect(loan.rows.every((r) => r.payment === 100)).toBe(true)
    expect(loan.rows.at(-1)?.balance).toBe(0)
  })

  it('keeps cent schedules consistent: rows sum to the totals', () => {
    const loan = amortize({ amount: 15_000, effectiveAnnualRate: 18.5, months: 36 }, 'USD')
    const sum = (key: 'payment' | 'interest' | 'principal') => Math.round(loan.rows.reduce((a, r) => a + r[key], 0) * 100) / 100
    expect(sum('payment')).toBe(loan.totalPaid)
    expect(sum('interest')).toBe(loan.totalInterest)
    expect(sum('principal')).toBe(15_000)
    expect(loan.rows.at(-1)?.balance).toBe(0)
  })

  it('handles a single month', () => {
    const loan = amortize({ amount: 1000, effectiveAnnualRate: 24, months: 1 }, 'USD')
    expect(loan.rows).toHaveLength(1)
    expect(loan.rows[0].balance).toBe(0)
    expect(loan.totalPaid).toBe(1018.09)
  })
})

describe('splitIncome', () => {
  it('splits 50/30/20 and the parts always add up', () => {
    expect(splitIncome(4_621_967, 'COP')).toEqual({ needs: 2_310_984, wants: 1_386_590, savings: 924_393 })
    expect(splitIncome(1000, 'USD')).toEqual({ needs: 500, wants: 300, savings: 200 })
    expect(splitIncome(0, 'USD')).toEqual({ needs: 0, wants: 0, savings: 0 })
  })
})

describe('compareWithRule', () => {
  const plain = (s?: string | null) => s?.replace(/[\u00a0\u202f]/g, ' ')

  it('compares fixed costs with needs and the savings rate with 20%', () => {
    const result = compareWithRule(5_000_000, { fixed: 2_070_000, savingsRate: 0.25, hasActivity: true }, 'COP')
    expect(plain(result.needs?.text)).toBe('Fixed costs this month are $ 2.070.000, 41% of your income: within the 50% for needs.')
    expect(result.needs?.ok).toBe(true)
    expect(result.savings).toEqual({ ok: true, text: "You saved 25% of this month's income: at or above the 20% goal." })
  })

  it('flags fixed costs above the needs share and a low savings rate', () => {
    const result = compareWithRule(3_000_000, { fixed: 2_000_000, savingsRate: 0.1, hasActivity: true }, 'COP')
    expect(result.needs?.ok).toBe(false)
    expect(plain(result.needs?.text)).toContain('67% of your income: above the 50% for needs.')
    expect(result.savings?.text).toBe("You saved 10% of this month's income: below the 20% goal.")
  })

  it('explains missing or negative savings and empty months', () => {
    expect(compareWithRule(1000, { fixed: 100, savingsRate: null, hasActivity: true }, 'USD').savings?.text).toContain('No income recorded')
    expect(compareWithRule(1000, { fixed: 100, savingsRate: -0.43, hasActivity: true }, 'USD').savings?.text).toBe(
      'You spent more than you earned this month (-43%), so nothing went to savings yet.',
    )
    expect(compareWithRule(1000, { fixed: 0, savingsRate: null, hasActivity: false }, 'USD')).toEqual({
      needs: null,
      savings: null,
      empty: 'Nothing recorded this month yet, so there is nothing to compare.',
    })
    expect(compareWithRule(0, { fixed: 100, savingsRate: 0.3, hasActivity: true }, 'USD').needs).toBeNull()
  })
})

describe('parseTool', () => {
  it('reads ?tool= and falls back to groceries', async () => {
    const { parseTool, TOOLS } = await import('./tools')
    expect(TOOLS.map((t) => t.id).slice(0, 5)).toEqual(['groceries', 'savings', 'compound', 'loan', 'rule'])
    expect(parseTool('loan')).toBe('loan')
    expect(parseTool(null)).toBe('groceries')
    expect(parseTool('LOAN')).toBe('groceries')
  })
})
