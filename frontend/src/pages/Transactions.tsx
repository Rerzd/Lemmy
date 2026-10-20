import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Receipt, Search, SearchX, X } from 'lucide-react'
import { listCategories } from '../api/categories'
import { deleteTransaction, listTransactions } from '../api/transactions'
import { TransactionList } from '../components/transactions/TransactionList'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Pagination } from '../components/ui/Pagination'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { SkeletonRows } from '../components/ui/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { useCurrency } from '../hooks/useAuth'
import { useMonth } from '../hooks/useMonth'
import { monthLabel } from '../lib/dates'
import { getErrorMessage } from '../lib/errors'
import { formatSigned } from '../lib/money'
import { inputClass } from '../lib/ui'
import type { Transaction, TxType } from '../types/api'

const PAGE_SIZE = 15
const SEARCH_DELAY_MS = 300

type TypeFilter = 'all' | TxType

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

// "null" = closed, "new" = create, otherwise the transaction being edited.
type ModalState = null | 'new' | Transaction

export function TransactionsPage() {
  const currency = useCurrency()
  const { year, month } = useMonth()

  // Filters live in the URL next to ?month so a filtered view survives a reload.
  const [params, setParams] = useSearchParams()
  const rawType = params.get('type')
  const type: TypeFilter = rawType === 'income' || rawType === 'expense' ? rawType : 'all'
  const categoryId = Number(params.get('category')) || undefined
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const updateParams = (changes: Record<string, string | number | undefined>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined || value === '') next.delete(key)
        else next.set(key, String(value))
      }
      // Any filter change starts over at page 1; only page changes keep it.
      if (!('page' in changes)) next.delete('page')
      return next
    })
  }

  // The input updates right away; the URL (and the request) waits for a pause in typing.
  const [search, setSearch] = useState(q)
  const searchTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(searchTimer.current), [])

  const onSearch = (value: string) => {
    setSearch(value)
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => updateParams({ q: value.trim() || undefined }), SEARCH_DELAY_MS)
  }

  const clearFilters = () => {
    window.clearTimeout(searchTimer.current)
    setSearch('')
    updateParams({ type: undefined, category: undefined, q: undefined })
  }

  const filters = {
    month,
    year,
    type: type === 'all' ? undefined : type,
    category_id: categoryId,
    q: q || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }
  const list = useAsync(() => listTransactions(filters), JSON.stringify(filters))
  const categories = useAsync(listCategories, 'categories')

  const allCategories = categories.data ?? []
  const categoryById = new Map(allCategories.map((c) => [c.id, c]))
  const filterCategories = type === 'all' ? allCategories : allCategories.filter((c) => c.type === type)
  const hasFilters = type !== 'all' || categoryId !== undefined || q !== ''

  const changeType = (next: TypeFilter) => {
    const keepCategory = next === 'all' || categoryById.get(categoryId ?? -1)?.type === next
    updateParams({ type: next === 'all' ? undefined : next, category: keepCategory ? categoryId : undefined })
  }

  const [modal, setModal] = useState<ModalState>(null)
  const [toDelete, setToDelete] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState(false)

  const onSaved = (_: Transaction, created: boolean) => {
    setModal(null)
    toast.success(created ? 'Transaction added' : 'Transaction updated')
    list.reload()
  }

  const askDelete = (transaction: Transaction) => {
    setModal(null)
    setToDelete(transaction)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteTransaction(toDelete.id)
      toast.success('Transaction deleted')
      setToDelete(null)
      // Removing the only row on the last page would leave an empty page behind.
      if (list.data && list.data.items.length === 1 && page > 1) updateParams({ page: page - 1 })
      else list.reload()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const addButton = (
    <Button onClick={() => setModal('new')} className="lg:order-last" disabled={!categories.data}>
      <Plus className="size-4" aria-hidden />
      <span className="sm:hidden">Add</span>
      <span className="hidden sm:inline">Add transaction</span>
    </Button>
  )

  return (
    <div className="space-y-4">
      {/* Phones: search + Add, then type, then category. lg: one row with Add at the end. */}
      <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center">
        <div className="flex gap-2 sm:gap-3 lg:contents">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search descriptions"
              aria-label="Search descriptions"
              className={`${inputClass} pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden`}
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearch('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
          {addButton}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 lg:contents">
          <SegmentedControl label="Filter by type" value={type} options={TYPE_OPTIONS} onChange={changeType} className="w-full sm:w-auto" />
          <select
            value={categoryId ?? ''}
            onChange={(e) => updateParams({ category: e.target.value || undefined })}
            aria-label="Filter by category"
            className={`${inputClass} sm:w-52`}
          >
            <option value="">All categories</option>
            {filterCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {type === 'all' ? `${c.name} (${c.type})` : c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : !list.data || !categories.data ? (
          <SkeletonRows rows={8} />
        ) : list.data.total === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No transactions match these filters"
              description={`Nothing in ${monthLabel({ year, month })} matches. Try a different search or category.`}
              action={
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title={`No transactions in ${monthLabel({ year, month })}`}
              description="Record your income and expenses to start tracking where your money goes."
              action={
                <Button size="sm" onClick={() => setModal('new')}>
                  <Plus className="size-4" aria-hidden />
                  Add transaction
                </Button>
              }
            />
          )
        ) : (
          <div className={`space-y-4 transition-opacity ${list.loading ? 'opacity-60' : ''}`} aria-busy={list.loading}>
            <TransactionList items={list.data.items} categoryById={categoryById} onEdit={setModal} onDelete={askDelete} />
            <div className="border-t border-slate-800 pt-4">
              <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onChange={(p) => updateParams({ page: p })} />
            </div>
          </div>
        )}
      </Card>

      {modal && (
        <TransactionModal
          transaction={modal === 'new' ? null : modal}
          categories={allCategories}
          defaultType={type === 'income' ? 'income' : 'expense'}
          currency={currency}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onDelete={askDelete}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete transaction?"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        {toDelete && (
          <p>
            <span className="font-medium text-slate-100">{toDelete.description || 'This transaction'}</span> (
            {formatSigned(toDelete.amount, toDelete.currency, toDelete.type)}) will be removed permanently. This can't be undone.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
