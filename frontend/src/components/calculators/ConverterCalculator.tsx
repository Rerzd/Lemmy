import { useId, useState } from 'react'
import { ArrowLeftRight, ArrowUpDown } from 'lucide-react'
import { getUsdRates } from '../../api/external'
import { useExternal } from '../../hooks/useExternal'
import { useNumberField } from '../../hooks/useNumberField'
import { LIMITS } from '../../lib/calculators/input'
import { formatDate } from '../../lib/dates'
import { CONVERTER_CURRENCIES, convert, crossRate, currencyOption, currentAge, formatAge, formatRate, swapPair } from '../../lib/external'
import { formatMoney } from '../../lib/money'
import { inputClass, labelClass } from '../../lib/ui'
import { ExternalNotice, StaleNote } from '../external/ExternalNotice'
import { Skeleton } from '../ui/Skeleton'
import { CalculatorCard, ResultFigures, ResultsPending } from './CalculatorCard'
import { NumberField } from './NumberField'

// active: the rates are only requested once this tab has been opened.
export function ConverterCalculator({ currency, active }: { currency: string; active: boolean }) {
  const amount = useNumberField('100', LIMITS.money)
  const [pair, setPair] = useState({ from: 'USD', to: currency === 'USD' ? 'COP' : currency })
  const [opened, setOpened] = useState(active)
  if (active && !opened) setOpened(true)
  const rates = useExternal('rates:USD', getUsdRates, opened)
  const fromId = useId()
  const toId = useId()

  const data = rates.data
  const usable = data && (data.status === 'ok' || data.status === 'stale') ? data : null
  const rate = usable ? crossRate(usable.rates, pair.from, pair.to) : null
  const age = usable ? currentAge(usable.age_seconds, rates.receivedAt) : null

  const select = (id: string, label: string, value: string, onChange: (v: string) => void) => (
    <div className="min-w-0 sm:flex-1">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {CONVERTER_CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {currencyOption(code)}
          </option>
        ))}
      </select>
    </div>
  )

  let results
  if (rates.loading) {
    results = (
      <div role="status" aria-label="Loading exchange rates">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-8 w-48" />
      </div>
    )
  } else if (data?.status === 'off') {
    results = <ExternalNotice kind="off" />
  } else if (!usable || rate === null) {
    results = <ExternalNotice kind="unavailable" what="Exchange rates are" onRetry={rates.reload} />
  } else if (amount.value === null) {
    results = <ResultsPending text="Enter an amount to convert." />
  } else {
    results = (
      <div className="space-y-4">
        <ResultFigures
          main={{
            label: `${formatMoney(amount.value, pair.from)} ${pair.from} is`,
            value: `${formatMoney(convert(amount.value, rate, pair.to), pair.to)} ${pair.to}`,
          }}
          rows={[
            { label: 'Rate used', value: `1 ${pair.from} = ${formatRate(rate)} ${pair.to}` },
            ...(usable.updated_at ? [{ label: 'Rates published', value: formatDate(usable.updated_at.slice(0, 10)) }] : []),
            ...(age !== null && !usable.stale ? [{ label: 'Updated', value: formatAge(age) }] : []),
          ]}
        />
        {usable.stale && <StaleNote age={age} what="rates" />}
      </div>
    )
  }

  return (
    <CalculatorCard
      title="Currency converter"
      explanation={
        <>
          amount × rate, where the rate comes from daily reference rates against the US dollar (one currency to another goes
          through the dollar). The result is rounded once, to the target currency's usual decimals. For reference only; banks
          and exchange houses add their own margin.{' '}
          <a
            href={data?.source.url ?? 'https://www.exchangerate-api.com'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center font-medium text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-primary sm:min-h-0"
          >
            Rates By Exchange Rate API
          </a>
        </>
      }
      inputs={
        <div className="space-y-4">
          <NumberField label="Amount" field={amount} prefix={pair.from} />
          {/* Phones stack From and To so the currency names fit; the swap button sits between them. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {select(fromId, 'From', pair.from, (from) => setPair((p) => ({ ...p, from })))}
            <button
              type="button"
              onClick={() => setPair(swapPair)}
              aria-label={`Swap currencies: convert ${pair.to} to ${pair.from}`}
              className="inline-flex size-11 shrink-0 items-center justify-center self-center rounded-control border border-border-strong bg-surface-2 text-text hover:bg-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-10 sm:self-auto"
            >
              <ArrowUpDown className="size-4 sm:hidden" aria-hidden />
              <ArrowLeftRight className="hidden size-4 sm:block" aria-hidden />
            </button>
            {select(toId, 'To', pair.to, (to) => setPair((p) => ({ ...p, to })))}
          </div>
        </div>
      }
      results={results}
    />
  )
}
