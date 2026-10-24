// Locale per currency so each one reads the way its users expect:
// "$ 1.250.000" for COP, "$1,250,000.00" for USD, "1.250.000,00 €" for EUR.
const LOCALES: Record<string, string> = {
  COP: 'es-CO',
  USD: 'en-US',
  EUR: 'de-DE',
  MXN: 'es-MX',
}

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(currency: string, compact: boolean): Intl.NumberFormat {
  const key = `${currency}:${compact}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(LOCALES[currency] ?? 'en-US', {
      style: 'currency',
      currency,
      // Pesos are never split into cents in everyday use.
      // Compact keeps one decimal so $1.8M doesn't read as $2M; pesos never show cents.
      maximumFractionDigits: compact ? 1 : currency === 'COP' ? 0 : 2,
      minimumFractionDigits: compact || currency === 'COP' ? 0 : undefined,
      notation: compact ? 'compact' : 'standard',
    })
    formatters.set(key, f)
  }
  return f
}

export function formatMoney(amount: number, currency: string, options: { compact?: boolean } = {}): string {
  return formatter(currency, options.compact ?? false).format(amount)
}

// "+ $ 50.000" / "- $ 12.000" for transaction lists.
export function formatSigned(amount: number, currency: string, type: 'income' | 'expense'): string {
  return `${type === 'income' ? '+' : '-'} ${formatMoney(Math.abs(amount), currency)}`
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

// Decimals each currency displays: pesos are never split into cents.
export function currencyDecimals(currency: string): number {
  return currency === 'COP' ? 0 : 2
}

/**
 * Rounds to what the currency displays, half away from zero. Calculators keep
 * full precision and round only here, at the end. toPrecision(15) first drops
 * float noise, so 1.005 (stored as 1.00499…) rounds to 1.01 as a person expects.
 */
export function roundMoney(value: number, currency: string): number {
  const factor = 10 ** currencyDecimals(currency)
  const scaled = Number((Math.abs(value) * factor).toPrecision(15))
  return (Math.sign(value) * Math.round(scaled)) / factor || 0
}
