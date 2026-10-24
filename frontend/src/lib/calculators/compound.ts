import { roundMoney } from '../money'
import { monthlyFromEffectiveAnnual } from './rates'

export interface CompoundInput {
  initial: number
  monthly: number // deposited at the end of each month
  yearlyRate: number // effective annual rate (EA) as a percent, compounded monthly
  years: number
}

export interface CompoundYear {
  year: number
  contributed: number // initial amount plus every deposit so far
  interest: number // interest earned so far
  balance: number
}

export interface CompoundResult {
  finalBalance: number
  totalContributed: number
  interestEarned: number
  years: CompoundYear[]
}

/**
 * Month-by-month growth: balance = balance·(1 + r) + deposit, where r is the monthly
 * equivalent of the effective annual rate, (1 + EA)^(1/12) − 1 (the same as the savings goal),
 * so twelve months of growth with no deposits give back exactly the yearly rate.
 * Values stay unrounded while compounding; each reported figure is rounded once,
 * and interest is balance − contributed after rounding so the three always add up.
 */
export function growCompound(input: CompoundInput, currency: string): CompoundResult {
  const r = monthlyFromEffectiveAnnual(input.yearlyRate / 100)
  let balance = input.initial
  let contributed = input.initial
  const years: CompoundYear[] = []

  for (let month = 1; month <= input.years * 12; month++) {
    balance = balance * (1 + r) + input.monthly
    contributed += input.monthly
    if (month % 12 === 0) {
      const b = roundMoney(balance, currency)
      const c = roundMoney(contributed, currency)
      years.push({ year: month / 12, contributed: c, interest: roundMoney(b - c, currency), balance: b })
    }
  }
  const last = years.at(-1) ?? { contributed: roundMoney(contributed, currency), balance: roundMoney(balance, currency), interest: 0 }
  return { finalBalance: last.balance, totalContributed: last.contributed, interestEarned: last.interest, years }
}
