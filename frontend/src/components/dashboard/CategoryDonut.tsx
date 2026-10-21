import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryTotal } from '../../types/api'
import { useChartColors } from '../../hooks/useTheme'
import { formatMoney } from '../../lib/money'
import { CategoryIcon } from '../ui/CategoryIcon'

interface SliceTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  currency: string
}

function SliceTooltip({ active, payload, currency }: SliceTooltipProps) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as CategoryTotal
  return (
    <div className="rounded-control border border-border bg-surface px-3 py-2 text-xs shadow-overlay">
      <p className="font-medium text-text">{row.name}</p>
      <p className="mt-0.5 text-text-muted tabular-nums">
        {formatMoney(row.total, currency)} · {(row.share * 100).toFixed(1)}%
      </p>
    </div>
  )
}

export function CategoryDonut({ rows, total, currency }: { rows: CategoryTotal[]; total: number; currency: string }) {
  const colors = useChartColors()
  return (
    // Container query: side by side only when the card itself is wide enough for names.
    <div className="@container">
      <div className="flex flex-col items-center gap-5 @lg:flex-row @lg:items-start">
        <div className="relative size-44 shrink-0" role="img" aria-label="Donut chart of spending by category">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="total"
                nameKey="name"
                innerRadius="68%"
                outerRadius="100%"
                // The panel color as stroke draws a 2px gap between slices.
                stroke={colors.surface}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {rows.map((row) => (
                  <Cell key={row.category_id} fill={row.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => (
                  <SliceTooltip active={active} payload={payload} currency={currency} />
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-text-muted">Spent</span>
            <span className="font-display text-base font-semibold text-text">
              {formatMoney(total, currency, { compact: true })}
            </span>
          </div>
        </div>

        {/* The legend doubles as the table view: name, amount and share for every slice. */}
        <ul className="w-full min-w-0 flex-1 space-y-2">
          {rows.map((row) => (
            <li key={row.category_id} className="flex items-center gap-2.5 text-sm">
              <CategoryIcon icon={row.icon} color={row.color} size="sm" />
              <span className="min-w-0 flex-1 truncate text-text">{row.name}</span>
              <span className="text-text tabular-nums">{formatMoney(row.total, currency)}</span>
              <span className="w-12 text-right text-xs text-text-muted tabular-nums">{(row.share * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
