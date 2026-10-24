import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listCategories } from '../api/categories'
import { CompoundCalculator } from '../components/calculators/CompoundCalculator'
import { ConverterCalculator } from '../components/calculators/ConverterCalculator'
import { GroceriesCalculator } from '../components/calculators/GroceriesCalculator'
import { LoanCalculator } from '../components/calculators/LoanCalculator'
import { RuleCalculator } from '../components/calculators/RuleCalculator'
import { SavingsGoalCalculator } from '../components/calculators/SavingsGoalCalculator'
import { ToolTabs } from '../components/calculators/ToolTabs'
import { useAsync } from '../hooks/useAsync'
import { useCurrency } from '../hooks/useAuth'
import { useMonth } from '../hooks/useMonth'
import { panelId, parseTool, tabId, type ToolId } from '../lib/calculators/tools'

export function CalculatorsPage() {
  const currency = useCurrency()
  const { year, month, search } = useMonth()
  const period = { year, month }
  const categories = useAsync(listCategories, 'categories')

  // ?tool= sits next to ?month=, so a calculator can be bookmarked or shared.
  const [params, setParams] = useSearchParams()
  const tool = parseTool(params.get('tool'))
  const select = (id: ToolId) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tool', id)
        return next
      },
      { replace: true },
    )

  // Every calculator stays mounted (just hidden), so inputs survive switching tools.
  // Nothing is saved anywhere: values live in this page until you leave it.
  const panel = (id: ToolId, children: ReactNode) => (
    // The panel itself is a Tab stop (ARIA tabs pattern), so it shows a ring like any control.
    <div
      key={id}
      role="tabpanel"
      id={panelId(id)}
      aria-labelledby={tabId(id)}
      hidden={tool !== id}
      tabIndex={0}
      className="rounded-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      {children}
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <p className="text-sm text-text-muted">
        Plan ahead with quick estimates. Everything is calculated in your browser and nothing is saved; only the converter fetches exchange rates, through Lemmy's server.
      </p>
      <ToolTabs value={tool} onChange={select} />
      {panel('groceries', <GroceriesCalculator currency={currency} period={period} search={search} categories={categories.data} />)}
      {panel('savings', <SavingsGoalCalculator currency={currency} />)}
      {panel('compound', <CompoundCalculator currency={currency} />)}
      {panel('loan', <LoanCalculator currency={currency} />)}
      {panel('rule', <RuleCalculator currency={currency} period={period} />)}
      {panel('converter', <ConverterCalculator currency={currency} active={tool === 'converter'} />)}
    </div>
  )
}
