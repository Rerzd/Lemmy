import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteCategory, listCategories } from '../api/categories'
import { CategoryModal } from '../components/categories/CategoryModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { getErrorMessage } from '../lib/errors'
import type { Category, TxType } from '../types/api'

const SECTIONS: { type: TxType; title: string; empty: string }[] = [
  { type: 'income', title: 'Income', empty: 'No income categories yet. Add one for salary, freelance work or any other money coming in.' },
  { type: 'expense', title: 'Expenses', empty: 'No expense categories yet. Add one to start sorting where your money goes.' },
]

// "null" = closed, otherwise create (with a preset type) or edit.
type ModalState = null | { type: TxType } | Category

interface CategoryCardProps {
  category: Category
  onEdit: () => void
  onDelete: () => void
}

function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  return (
    <li className="group flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 pr-1.5 transition-colors hover:border-slate-700 sm:pr-3">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-3 text-left focus-visible:outline-2 focus-visible:outline-violet-500"
      >
        <CategoryIcon icon={category.icon} color={category.color} />
        <span className="truncate text-sm font-medium text-slate-200">{category.name}</span>
      </button>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${category.name}`}
          className="flex size-11 items-center justify-center rounded-md text-slate-500 sm:size-8 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-violet-500"
        >
          <Pencil className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${category.name}`}
          className="flex size-11 items-center justify-center rounded-md text-slate-500 sm:size-8 hover:bg-slate-800 hover:text-rose-400 focus-visible:outline-2 focus-visible:outline-violet-500"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  )
}

export function CategoriesPage() {
  const categories = useAsync(listCategories, 'categories')
  const [modal, setModal] = useState<ModalState>(null)
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const onSaved = (category: Category, created: boolean) => {
    setModal(null)
    toast.success(created ? `${category.name} added` : `${category.name} updated`)
    categories.reload()
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteCategory(toDelete.id)
      toast.success(`${toDelete.name} deleted`)
      categories.reload()
    } catch (err) {
      // 409 when it still has transactions or budgets; the API says how many.
      toast.error(getErrorMessage(err), { duration: 6000 })
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  if (categories.error) {
    return (
      <Card>
        <ErrorState message={categories.error} onRetry={categories.reload} />
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">Group your transactions and budgets. Each one has its own color and icon.</p>
        <Button onClick={() => setModal({ type: 'expense' })} className="shrink-0">
          <Plus className="size-4" aria-hidden />
          <span className="sm:hidden">Add</span>
          <span className="hidden sm:inline">Add category</span>
        </Button>
      </div>

      {SECTIONS.map((section) => {
        const items = categories.data?.filter((c) => c.type === section.type)
        return (
          <section key={section.type} aria-labelledby={`section-${section.type}`}>
            <header className="mb-3 flex items-center justify-between">
              <h2 id={`section-${section.type}`} className="text-sm font-semibold text-slate-200">
                {section.title}
                {items && <span className="ml-2 font-normal text-slate-500 tabular-nums">{items.length}</span>}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setModal({ type: section.type })}>
                <Plus className="size-4" aria-hidden />
                Add {section.type}
              </Button>
            </header>

            {!items ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-400">{section.empty}</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => (
                  <CategoryCard key={c.id} category={c} onEdit={() => setModal(c)} onDelete={() => setToDelete(c)} />
                ))}
              </ul>
            )}
          </section>
        )
      })}

      {modal && (
        <CategoryModal
          category={'id' in modal ? modal : null}
          defaultType={modal.type}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete category?"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        {toDelete && (
          <p>
            <span className="font-medium text-slate-100">{toDelete.name}</span> will be removed. Categories that still have
            transactions or budgets can't be deleted until those are moved or removed.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
