import { NavLink } from 'react-router-dom'
import { useMonth } from '../../hooks/useMonth'
import { NAV_ITEMS } from '../../lib/nav'

// Bottom tab bar for phones (below the sm breakpoint, 640 px).
export function MobileNav() {
  const { search } = useMonth()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      aria-label="Main"
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={{ pathname: to, search }}
          end={to === '/'}
          className={({ isActive }) =>
            `flex h-16 flex-col items-center justify-center gap-1 text-xs ${
              isActive ? 'font-semibold text-text' : 'font-medium text-text-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {/* Kiwi pill behind the active icon; ink keeps the glyph at 8:1. */}
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-highlight text-ink' : ''}`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
