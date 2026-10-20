import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

interface PaginationProps {
  page: number // 1-based
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-xs text-slate-500 tabular-nums">
        {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-slate-500 tabular-nums sm:inline">
          Page {page} of {pages}
        </span>
        <Button variant="secondary" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
