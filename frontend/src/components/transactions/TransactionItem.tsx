import type { Category, Transaction } from '../../types/api'
import { formatDate } from '../../lib/dates'
import { formatSigned } from '../../lib/money'
import { CategoryIcon } from '../ui/CategoryIcon'

interface TransactionItemProps {
  transaction: Transaction
  category?: Category
  onClick?: () => void
}

// Compact row used on the dashboard and as the card layout on phones.
export function TransactionItem({ transaction, category, onClick }: TransactionItemProps) {
  const content = (
    <>
      <CategoryIcon icon={category?.icon ?? 'tag'} color={category?.color ?? '#64748b'} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">
          {transaction.description || category?.name || 'Transaction'}
        </p>
        <p className="truncate text-xs text-slate-500">
          {category?.name ?? 'Unknown category'} · {formatDate(transaction.date)}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-medium tabular-nums ${transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}
      >
        {formatSigned(transaction.amount, transaction.currency, transaction.type)}
      </span>
    </>
  )

  if (!onClick) return <div className="flex items-center gap-3 py-2.5">{content}</div>
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-slate-800/60 focus-visible:outline-2 focus-visible:outline-violet-500"
    >
      {content}
    </button>
  )
}
