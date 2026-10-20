import type { KeyboardEvent } from 'react'
import { Trash2 } from 'lucide-react'
import type { Category, Transaction } from '../../types/api'
import { formatDate } from '../../lib/dates'
import { formatSigned } from '../../lib/money'
import { CategoryChip } from '../ui/CategoryIcon'
import { TransactionItem } from './TransactionItem'

interface TransactionListProps {
  items: Transaction[]
  categoryById: Map<number, Category>
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}

// Table from md up, compact cards below. Clicking a row (or Enter on it) edits it.
export function TransactionList({ items, categoryById, onEdit, onDelete }: TransactionListProps) {
  const onRowKey = (e: KeyboardEvent, transaction: Transaction) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onEdit(transaction)
    }
  }

  return (
    <>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <th className="py-2.5 pr-4 font-medium">Date</th>
            <th className="py-2.5 pr-4 font-medium">Description</th>
            <th className="py-2.5 pr-4 font-medium">Category</th>
            <th className="py-2.5 pr-2 text-right font-medium">Amount</th>
            <th className="w-10 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {items.map((t) => {
            const category = categoryById.get(t.category_id)
            return (
              <tr
                key={t.id}
                tabIndex={0}
                onClick={() => onEdit(t)}
                onKeyDown={(e) => onRowKey(e, t)}
                aria-label={`Edit ${t.description || category?.name || 'transaction'}`}
                className="group cursor-pointer hover:bg-slate-800/40 focus-visible:bg-slate-800/40 focus-visible:outline-none"
              >
                <td className="py-3 pr-4 whitespace-nowrap text-slate-400 tabular-nums">{formatDate(t.date)}</td>
                <td className="max-w-0 py-3 pr-4">
                  <p className="truncate text-slate-200">{t.description || <span className="text-slate-500">No description</span>}</p>
                </td>
                <td className="py-3 pr-4">
                  {category ? (
                    <CategoryChip name={category.name} icon={category.icon} color={category.color} />
                  ) : (
                    <span className="text-xs text-slate-500">Unknown</span>
                  )}
                </td>
                <td
                  className={`py-3 pr-2 text-right font-medium whitespace-nowrap tabular-nums ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {formatSigned(t.amount, t.currency, t.type)}
                </td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(t)
                    }}
                    aria-label="Delete transaction"
                    className="rounded-md p-1.5 text-slate-500 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 hover:bg-slate-800 hover:text-rose-400 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-violet-500"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="-mx-2 divide-y divide-slate-800 md:hidden">
        {items.map((t) => (
          <TransactionItem key={t.id} transaction={t} category={categoryById.get(t.category_id)} onClick={() => onEdit(t)} />
        ))}
      </div>
    </>
  )
}
