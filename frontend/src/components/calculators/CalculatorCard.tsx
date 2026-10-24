import type { ReactNode } from 'react'
import { Calculator } from 'lucide-react'

interface CalculatorCardProps {
  title: string
  // One line on how the number is computed.
  explanation: ReactNode
  inputs: ReactNode
  results: ReactNode
  footer?: ReactNode
}

// Inputs on the left, live results on the right (stacked on phones).
export function CalculatorCard({ title, explanation, inputs, results, footer }: CalculatorCardProps) {
  return (
    <section className="rounded-surface border border-border bg-surface" aria-label={title}>
      <div className="grid lg:grid-cols-2">
        <div className="space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          {inputs}
        </div>
        <div className="flex flex-col gap-4 border-t border-border bg-bg/60 p-5 sm:p-6 lg:rounded-r-surface lg:border-t-0 lg:border-l" aria-live="polite">
          {results}
          <p className="mt-auto flex items-start gap-2 border-t border-border pt-3 text-xs text-text-muted">
            <Calculator className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">How it's calculated:</span> {explanation}
            </span>
          </p>
        </div>
      </div>
      {footer && <div className="border-t border-border p-5 sm:p-6">{footer}</div>}
    </section>
  )
}

interface ResultFiguresProps {
  main: { label: string; value: string; note?: string }
  rows?: { label: string; value: string }[]
}

// The headline number big, the supporting ones as a definition list.
export function ResultFigures({ main, rows = [] }: ResultFiguresProps) {
  return (
    <div>
      <p className="text-sm text-text-muted">{main.label}</p>
      <p className="mt-1 font-display text-2xl font-semibold break-words text-text sm:text-3xl">{main.value}</p>
      {main.note && <p className="mt-1 text-sm text-text-muted">{main.note}</p>}
      {rows.length > 0 && (
        <dl className="mt-4 divide-y divide-border border-t border-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 py-2 text-sm">
              <dt className="text-text-muted">{row.label}</dt>
              <dd className="text-right font-semibold text-text">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

export function ResultsPending({ text = 'Fill in the fields to see the result.' }: { text?: string }) {
  return <p className="text-sm text-text-muted">{text}</p>
}
