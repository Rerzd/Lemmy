import type { BudgetStatus, Overview } from '../types/api'
import { monthLabel, type YearMonth } from './dates'
import { formatMoney } from './money'
import { daysLeft, periodKind } from './period'

// The sentence is built from parts so the page can emphasize the amount.
export interface HeadlinePart {
  text: string
  emphasis?: 'neutral' | 'good' | 'bad'
}

export interface Headline {
  parts: HeadlinePart[]
  detail: string | null
}

const plain = (text: string): HeadlinePart => ({ text })

function daysToGo(n: number): string {
  return n === 1 ? 'and today is the last day of the month' : `${n} days to go`
}

/**
 * One sentence that answers "how am I doing this month?". Budgets win when there
 * are any (that's the plan the user set); otherwise it falls back to income minus spending.
 */
export function buildHeadline(
  period: YearMonth,
  today: Date,
  overview: Pick<Overview, 'income' | 'expense' | 'transaction_count'>,
  budgets: Pick<BudgetStatus, 'budgeted' | 'spent' | 'status'>[],
  currency: string,
): Headline {
  const money = (n: number) => formatMoney(Math.abs(n), currency)
  const kind = periodKind(period, today)
  const name = monthLabel(period)
  const n = daysLeft(period, today)
  const budgeted = budgets.reduce((sum, b) => sum + b.budgeted, 0)
  const spent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const over = budgets.filter((b) => b.status === 'over').length
  const net = overview.income - overview.expense

  if (kind === 'future') {
    return {
      parts: [plain(`${name} hasn't started yet.`)],
      detail: budgets.length ? `You've already set ${budgets.length} budget${budgets.length > 1 ? 's' : ''} for it.` : 'Setting budgets now gives the month a plan.',
    }
  }

  if (kind === 'current') {
    if (budgets.length) {
      const left = budgeted - spent
      if (left >= 0) {
        return {
          parts: [plain('You have '), { text: money(left), emphasis: 'good' }, plain(` left in your budgets, ${daysToGo(n)}.`)],
          detail: n > 1 ? `That's about ${money(left / n)} a day.` : null,
        }
      }
      return {
        parts: [plain("You're "), { text: money(left), emphasis: 'bad' }, plain(` over your budgets, ${n === 1 ? 'on the last day of the month' : `with ${n} days to go`}.`)],
        detail: `${over} of ${budgets.length} budget${budgets.length > 1 ? 's are' : ' is'} over the limit.`,
      }
    }
    if (overview.transaction_count === 0) {
      return { parts: [plain(`Nothing recorded yet for ${name}, ${daysToGo(n)}.`)], detail: null }
    }
    if (net >= 0) {
      return {
        parts: [plain('You have '), { text: money(net), emphasis: 'good' }, plain(` left from this month's income, ${daysToGo(n)}.`)],
        detail: null,
      }
    }
    return {
      parts: [plain("You've spent "), { text: money(net), emphasis: 'bad' }, plain(` more than you earned, ${n === 1 ? 'on the last day of the month' : `with ${n} days to go`}.`)],
      detail: null,
    }
  }

  // A month that's over: report how it ended.
  if (budgets.length) {
    const left = budgeted - spent
    return {
      parts: [
        plain(`In ${name} you spent ${money(spent)} of ${money(budgeted)} budgeted, `),
        { text: money(left), emphasis: left >= 0 ? 'good' : 'bad' },
        plain(left >= 0 ? ' under.' : ' over.'),
      ],
      detail: over ? `${over} budget${over > 1 ? 's' : ''} went over the limit.` : 'Every budget stayed within its limit.',
    }
  }
  if (overview.transaction_count === 0) return { parts: [plain(`No transactions in ${name}.`)], detail: null }
  return {
    parts: net >= 0
      ? [plain(`In ${name} you saved `), { text: money(net), emphasis: 'good' }, plain('.')]
      : [plain(`In ${name} you spent `), { text: money(net), emphasis: 'bad' }, plain(' more than you earned.')],
    detail: null,
  }
}

export const headlineText = (h: Headline) => h.parts.map((p) => p.text).join('')
