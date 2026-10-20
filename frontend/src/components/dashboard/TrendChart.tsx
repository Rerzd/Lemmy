import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '../../types/api'
import { CHART_COLORS } from '../../lib/chartColors'
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
}

function TrendTooltip({ active, payload, currency }: TrendTooltipProps) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as Row
  return (
    <div className="min-w-44 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium text-slate-200">{row.label}</p>
      {(
        [
          ['Income', row.income, CHART_COLORS.income],
          ['Expenses', row.expense, CHART_COLORS.expense],
        ] as const
      ).map(([name, value, color]) => (
        <div key={name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="size-2 rounded-sm" style={{ backgroundColor: color }} />
            {name}
          </span>
          <span className="text-slate-100 tabular-nums">{formatMoney(value, currency)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-4 border-t border-slate-800 pt-1">
        <span className="text-slate-400">Net</span>
        <span className="font-medium text-slate-100 tabular-nums">{formatMoney(row.net, currency)}</span>
      </div>
    </div>
  )
}

export function TrendChart({ points, currency }: { points: TrendPoint[]; currency: string }) {
  const rows: Row[] = points.map((p) => ({ ...p, label: monthLabel(p, 'compact') }))

  return (
    <div>
      {/* Two series: always a legend, so identity never relies on color alone. */}
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.income }} />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.expense }} />
          Expenses
        </span>
      </div>
      <div className="h-64 lg:h-[26rem]" role="img" aria-label="Bar chart of income and expenses for the last six months">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="label"
              tickFormatter={(label: string) => label.split(' ')[0]}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              width={56}
              tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })}
              tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
              content={({ active, payload }) => (
                <TrendTooltip active={active} payload={payload} currency={currency} />
              )}
            />
            <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="expense" name="Expenses" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
