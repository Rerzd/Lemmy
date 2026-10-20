import type { ButtonHTMLAttributes } from 'react'
import { LoaderCircle } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-violet-600 text-white hover:bg-violet-500',
  secondary: 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700',
  ghost: 'text-slate-300 hover:bg-slate-800 hover:text-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
}

const SIZES: Record<Size, string> = {
  // 44px touch targets on phones, compact from sm up.
  sm: 'h-11 min-w-11 sm:h-8 sm:min-w-0 px-3 text-sm gap-1.5',
  md: 'h-11 sm:h-10 px-4 text-sm gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}
