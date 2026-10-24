import { roundMoney } from '../money'
import { monthlyFromEffectiveAnnual } from './rates'

export interface LoanInput {
  amount: number
  effectiveAnnualRate: number // percent, e.g. 24 for 24 % EA
  months: number
}

export interface LoanRow {
  month: number
  payment: number
  interest: number
  principal: number
  balance: number // still owed after this payment
}

export interface LoanResult {
  monthlyRate: number // e.g. 0.0180876 for 24 % EA
  payment: number
  totalInterest: number
  totalPaid: number
  rows: LoanRow[]
}

/**
 * French amortization: a fixed installment P·i / (1 − (1 + i)^−n), with i the
 * monthly equivalent of the effective annual rate. Like a bank, the installment
 * and each month's interest are rounded to the currency, principal is the rest,
 * and the last row absorbs the rounding so the balance ends at exactly 0. Every
 * total is a sum of the rounded rows, so the table always adds up to the totals.
 */
export function amortize(input: LoanInput, currency: string): LoanResult {
  const { amount, months } = input
  const i = monthlyFromEffectiveAnnual(input.effectiveAnnualRate / 100)
  const exact = i === 0 ? amount / months : (amount * i) / (1 - Math.pow(1 + i, -months))
  const payment = roundMoney(exact, currency)

  const rows: LoanRow[] = []
  let balance = amount
  for (let month = 1; month <= months; month++) {
    const interest = roundMoney(balance * i, currency)
    const principal = month === months ? balance : roundMoney(payment - interest, currency)
    balance = roundMoney(balance - principal, currency)
    rows.push({ month, payment: roundMoney(principal + interest, currency), interest, principal, balance })
  }
  const sum = (key: 'interest' | 'payment') => roundMoney(rows.reduce((acc, row) => acc + row[key], 0), currency)
  return { monthlyRate: i, payment, totalInterest: sum('interest'), totalPaid: sum('payment'), rows }
}
