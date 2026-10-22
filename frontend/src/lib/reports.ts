import type { LivingCosts } from '../types/api'
import type { HeadlinePart } from './headline'
import { formatMoney } from './money'

export interface ReportHeadline {
  parts: HeadlinePart[]
  detail: string | null
}

const plain = (text: string): HeadlinePart => ({ text })

// "about 2.4 months" / "about 1 month" / "about 12 days" for cushions under a month.
export function cushionText(months: number): string {
  if (months < 1) {
    const days = Math.max(1, Math.round(months * 30))
    return `about ${days} ${days === 1 ? 'day' : 'days'}`
  }
  const rounded = Math.round(months * 10) / 10
  return `about ${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} ${rounded === 1 ? 'month' : 'months'}`
}

/**
 * The report's opening sentence: what a month of living costs, how much of it is
 * fixed, and how long savings would last. Without history it says so plainly.
 */
export function buildLivingCostsHeadline(report: LivingCosts, currency: string): ReportHeadline {
  const money = (n: number) => formatMoney(n, currency, { compact: true })
  const { baseline, months_used, cushion_months, this_month } = report

  if (!baseline || months_used === 0) {
    return {
      parts: [plain('Not enough history yet to estimate your living costs.')],
      detail:
        this_month.total > 0
          ? `So far this month you've spent ${money(this_month.total)}. The estimate starts once a full month is recorded.`
          : 'The estimate starts once a full month of spending is recorded.',
    }
  }

  if (baseline.total === 0) {
    return {
      parts: [plain(`No spending recorded in the last ${months_used === 1 ? 'month' : `${months_used} months`}.`)],
      detail: null,
    }
  }

  const parts: HeadlinePart[] = [plain('Living costs about '), { text: money(baseline.total), emphasis: 'neutral' }, plain(' a month.')]
  if (baseline.fixed === 0) parts.push(plain(' All of it is variable.'))
  else if (baseline.variable === 0) parts.push(plain(' All of it is fixed.'))
  else parts.push(plain(' '), { text: money(baseline.fixed), emphasis: 'neutral' }, plain(' is fixed.'))

  let detail: string | null = null
  if (cushion_months !== null) {
    detail = cushion_months === 0 ? "You don't have savings to cover it yet." : `Your savings cover ${cushionText(cushion_months)}.`
  }
  return { parts, detail }
}

// Shown next to baseline figures whenever fewer than 3 months were averaged.
export function monthsUsedNote(monthsUsed: number): string | null {
  if (monthsUsed >= 3) return null
  if (monthsUsed === 0) return 'No complete months of history yet'
  return `Based on ${monthsUsed} ${monthsUsed === 1 ? 'month' : 'months'} of history`
}

// "Fixed" / "Variable" travels as text and an icon, never as color alone.
export const COST_KIND = {
  fixed: { label: 'Fixed', tone: 'bg-accent' },
  variable: { label: 'Variable', tone: 'bg-primary' },
} as const
