import { useEffect, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

// Bottom sheet on phones, centered dialog from sm up. Escape and the backdrop close it.
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    // Keep the page behind from scrolling while the dialog is open.
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[90dvh] w-full flex-col rounded-t-2xl border border-slate-800 bg-slate-900 shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-my-2 -mr-3 flex size-11 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 sm:m-0 sm:size-auto sm:p-1"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-800 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}
