import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
        <Icon className="size-5 text-slate-400" aria-hidden />
      </div>
      <p className="text-sm font-medium text-slate-200">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
