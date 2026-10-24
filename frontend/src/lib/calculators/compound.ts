import { roundMoney } from '../money'

export interface CompoundInput {
  initial: number
  monthly: number // deposited at the end of each month
  yearlyRate: number // nominal yearly rate as a percent, compounded monthly (rate / 12 a month)
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
 * Month-by-month growth: balance = balance·(1 + r) + deposit, with r = rate/12.
 * Values stay unrounded while compounding; each reported figure is rounded once,
 * and interest is balance − contributed after rounding so the three always add up.
 */
export function growCompound(input: CompoundInput, currency: string): CompoundResult {
  const r = input.yearlyRate / 100 / 12
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
