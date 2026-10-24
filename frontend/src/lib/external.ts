import { roundMoney } from './money'

// Must match SUPPORTED_CURRENCIES in backend/app/services/external_service.py.
export const CONVERTER_CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'GBP', 'CAD', 'BRL', 'CLP', 'PEN', 'ARS'] as const

const currencyNames = new Intl.DisplayNames('en', { type: 'currency' })

// "COP · Colombian Peso" for the converter's selects.
export function currencyOption(code: string): string {
  return `${code} · ${currencyNames.of(code) ?? code}`
}

// "just now", "12 min ago", "3 h ago", "2 days ago".
export function formatAge(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`
  const days = Math.floor(s / 86_400)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

// The server reports the age when it answered; add the time the answer has spent in the
// client cache since, so "updated 3 h ago" stays true after switching pages.
export function currentAge(ageSeconds: number | null, receivedAt: number, now: number = Date.now()): number | null {
  return ageSeconds === null ? null : ageSeconds + Math.max(0, (now - receivedAt) / 1000)
}

const shortDate = (iso: string, year: boolean) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: year ? 'numeric' : undefined })
}

// A TRM is valid for one day or, over weekends and holidays, a range of days.
// "Valid for Oct 23, 2026" · "Valid Oct 24 – Oct 26, 2026" · across years, both years.
export function validityLabel(from: string, to: string): string {
  if (from === to) return `Valid for ${shortDate(from, true)}`
  const sameYear = from.slice(0, 4) === to.slice(0, 4)
  return `Valid ${shortDate(from, !sameYear)} – ${shortDate(to, true)}`
}

// The TRM has two decimals by law: "$ 3.158,43".
const trmFormat = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
export function formatTrm(value: number): string {
  return trmFormat.format(value)
}

// Exchange rates span 0.0003 (COP→USD) to 3,000+ (USD→COP): two to four decimals for
// rates of 1 or more, four significant digits below that, never rounding a rate to 0.
export function formatRate(value: number): string {
  const options: Intl.NumberFormatOptions =
    value >= 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 4 } : { maximumSignificantDigits: 4 }
  return new Intl.NumberFormat('en-US', options).format(value)
}

/**
 * Units of `to` per 1 `from`, from a table of rates against USD (USD itself is 1 even if
 * the table leaves it out). Null when either currency is missing from the table.
 */
export function crossRate(usdRates: Record<string, number>, from: string, to: string): number | null {
  const per = (code: string) => (code === 'USD' ? 1 : usdRates[code])
  const a = per(from)
  const b = per(to)
  if (!a || !b || !Number.isFinite(a) || !Number.isFinite(b)) return null
  return from === to ? 1 : b / a
}

/** amount × rate at full precision, rounded once to the target currency's decimals. */
export function convert(amount: number, rate: number, to: string): number {
  return roundMoney(amount * rate, to)
}

export function swapPair<T extends { from: string; to: string }>(pair: T): T {
  return { ...pair, from: pair.to, to: pair.from }
}
