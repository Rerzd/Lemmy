import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}

// The standard panel: one step lighter than the page, hairline border.
export function Card({ title, action, className = '', children }: CardProps) {
  return (
    <section className={`rounded-surface border border-border bg-surface ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          {title && <h2 className="text-sm font-semibold text-text">{title}</h2>}
          {action}
        </header>
      )}
      <div className={title || action ? 'px-5 pb-5' : 'p-5'}>{children}</div>
    </section>
  )
}
