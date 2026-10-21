import { Trash2 } from 'lucide-react'
import type { Category, Transaction } from '../../types/api'
import { dayLabel } from '../../lib/dates'
import { DEFAULT_CATEGORY_COLOR } from '../../lib/categoryIcons'
import { formatSigned } from '../../lib/money'
import { CategoryChip, CategoryIcon } from '../ui/CategoryIcon'

interface TransactionListProps {
  items: Transaction[]
  categoryById: Map<number, Category>
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}

// Rows grouped under day headings. Items arrive newest first, so consecutive dates form a group.
function groupByDay(items: Transaction[]) {
  const groups: { date: string; items: Transaction[] }[] = []
  for (const t of items) {
    const last = groups.at(-1)
    if (last?.date === t.date) last.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  }
  return groups
}

export function TransactionList({ items, categoryById, onEdit, onDelete }: TransactionListProps) {
  return (
    <div className="space-y-5">
      {groupByDay(items).map((group) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`}>
          <h3 id={`day-${group.date}`} className="mb-1 px-2 font-sans text-xs font-semibold tracking-wide text-text-muted uppercase">
            {dayLabel(group.date)}
          </h3>
          <ul className="-mx-2">
            {group.items.map((t) => {
              const category = categoryById.get(t.category_id)
              const title = t.description || category?.name || 'Transaction'
              return (
                <li key={t.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(t)}
                    aria-label={`Edit ${title}, ${formatSigned(t.amount, t.currency, t.type)}`}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-control px-2 py-2 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <CategoryIcon icon={category?.icon ?? 'tag'} color={category?.color ?? DEFAULT_CATEGORY_COLOR} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-medium ${t.description ? 'text-text' : 'text-text-muted'}`}>{title}</span>
                      {/* Phones show the category under the description; wider screens give it a column. */}
                      <span className="block truncate text-xs text-text-muted md:hidden">{category?.name ?? 'Unknown category'}</span>
                    </span>
                    <span className="hidden w-48 shrink-0 md:block">
                      {category && <CategoryChip name={category.name} icon={category.icon} color={category.color} />}
                    </span>
                    <span className={`shrink-0 text-right text-sm font-semibold md:w-32 ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                      {formatSigned(t.amount, t.currency, t.type)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(t)}
                    aria-label={`Delete ${title}`}
                    className="hidden size-9 shrink-0 items-center justify-center rounded-chip text-text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-2 hover:text-status-over focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary md:flex"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
