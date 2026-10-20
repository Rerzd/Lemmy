import { useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { titleForPath } from '../../lib/nav'
import { MonthPicker } from './MonthPicker'

export function TopBar() {
  const { pathname } = useLocation()
  const { logout } = useAuth()
  // Categories aren't tied to a month, so the picker would only confuse there.
  const showMonth = pathname !== '/categories'

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-lg font-semibold text-slate-100">{titleForPath(pathname)}</h1>
        </div>
        <div className="flex items-center gap-1">
          {showMonth && <MonthPicker />}
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            className="flex size-11 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 sm:hidden"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
