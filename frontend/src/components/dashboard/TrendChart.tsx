import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '../../types/api'
import { useChartColors, usePrefersReducedMotion } from '../../hooks/useTheme'
import { monthLabel } from '../../lib/dates'
import { formatMoney } from '../../lib/money'

interface Row {
  label: string
  income: number
  expense: number
  net: number
}

interface TrendTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  currency: string
  colors: { income: string; expense: string }
}

function TrendTooltip({ active, payload, currency, colors }: TrendTooltipProps) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as Row
  return (
    <div className="min-w-44 rounded-control border border-border bg-surface px-3 py-2 text-xs shadow-overlay">
      <p className="mb-1.5 font-medium text-text">{row.label}</p>
      {(
        [
          ['Income', row.income, colors.income],
          ['Expenses', row.expense, colors.expense],
        ] as const
      ).map(([name, value, color]) => (
        <div key={name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="size-2 rounded-sm" style={{ backgroundColor: color }} />
            {name}
          </span>
          <span className="text-text tabular-nums">{formatMoney(value, currency)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-4 border-t border-border pt-1">
        <span className="text-text-muted">Net</span>
        <span className="font-medium text-text tabular-nums">{formatMoney(row.net, currency)}</span>
      </div>
    </div>
  )
}

export function TrendChart({ points, currency }: { points: TrendPoint[]; currency: string }) {
  const rows: Row[] = points.map((p) => ({ ...p, label: monthLabel(p, 'compact') }))
  // Token values for the active theme; the chart re-renders when the theme changes.
  const colors = useChartColors()
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div>
      {/* Two series: always a legend, so identity never relies on color alone. */}
      <div className="mb-3 flex items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: colors.income }} />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: colors.expense }} />
          Expenses
        </span>
      </div>
      <div className="h-64 lg:h-80" role="img" aria-label="Bar chart of income and expenses for the last six months">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="label"
              tickFormatter={(label: string) => label.split(' ')[0]}
              tick={{ fill: colors.axis, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              width={56}
              tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })}
              tick={{ fill: colors.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: colors.cursor, fillOpacity: 0.6 }}
              content={({ active, payload }) => (
                <TrendTooltip active={active} payload={payload} currency={currency} colors={colors} />
              )}
            />
            <Bar dataKey="income" name="Income" fill={colors.income} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={!reducedMotion} />
            <Bar dataKey="expense" name="Expenses" fill={colors.expense} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={!reducedMotion} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
