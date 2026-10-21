import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useMonth } from '../../hooks/useMonth'
import { NAV_ITEMS } from '../../lib/nav'
import { Logo } from './Logo'

// Desktop navigation: icons only on small tablets, full labels from lg up.
export function Sidebar() {
  const { user, logout } = useAuth()
  const { search } = useMonth()

  return (
    <aside className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-r border-border bg-bg sm:flex lg:w-60">
      <div className="flex h-16 items-center justify-center px-4 lg:justify-start lg:px-5">
        <span className="lg:hidden">
          <Logo withWordmark={false} />
        </span>
        <span className="hidden lg:inline">
          <Logo />
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4 lg:px-3" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={{ pathname: to, search }}
            end={to === '/'}
            title={label}
            className={({ isActive }) =>
              `relative flex h-10 items-center justify-center gap-3 rounded-control px-3 text-sm font-medium transition-colors lg:justify-start ${
                isActive
                  ? 'bg-surface text-text shadow-raised before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-primary'
                  : 'text-text-muted hover:bg-surface hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`size-4.5 shrink-0 ${isActive ? 'text-primary-text' : ''}`} aria-hidden />
                <span className="hidden lg:inline">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-2 lg:p-3">
        <div className="flex items-center gap-3 rounded-control px-1 py-2 lg:px-2">
          <span className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-text lg:flex">
            {user?.name.charAt(0).toUpperCase()}
          </span>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm font-medium text-text">{user?.name}</p>
            <p className="truncate text-xs text-text-muted">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="mx-auto rounded-chip p-2 text-text-muted hover:bg-surface-2 hover:text-text lg:mx-0"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
