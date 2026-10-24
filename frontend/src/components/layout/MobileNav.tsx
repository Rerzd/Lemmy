import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Ellipsis } from 'lucide-react'
import { useMonth } from '../../hooks/useMonth'
import { NAV_ITEMS } from '../../lib/nav'

// Bottom tab bar for phones (below the sm breakpoint, 640 px). Five slots at 375 px
// leave ~75 px each, so the four everyday pages get a tab and the rest (Categories,
// mostly set-up, and Calculators, occasional planning) sit under "More".
const PRIMARY = NAV_ITEMS.filter((item) => !item.more)
const MORE = NAV_ITEMS.filter((item) => item.more)

const slot = 'flex h-16 min-w-0 flex-col items-center justify-center gap-1 text-xs tracking-tight'

function TabFace({ active, icon, label }: { active: boolean; icon: ReactNode; label: string }) {
  return (
    <>
      {/* Kiwi pill behind the active icon; ink keeps the glyph at 8:1. */}
      <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? 'bg-highlight text-ink' : ''}`}>
        {icon}
      </span>
      {label}
    </>
  )
}

export function MobileNav() {
  const { search } = useMonth()
  const { pathname } = useLocation()
  const menuId = useId()
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const current = MORE.find((item) => pathname.startsWith(item.to))

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpenOn(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenOn(null)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      aria-label="Main"
    >
      {PRIMARY.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={{ pathname: to, search }}
          end={to === '/'}
          className={({ isActive }) => `${slot} ${isActive ? 'font-semibold text-text' : 'font-medium text-text-muted'}`}
        >
          {({ isActive }) => <TabFace active={isActive} icon={<Icon className="size-5" aria-hidden />} label={label} />}
        </NavLink>
      ))}

      <div ref={wrapper} className="relative min-w-0">
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={current ? `More pages, current: ${current.label}` : 'More pages'}
          onClick={() => setOpenOn(open ? null : pathname)}
          className={`${slot} w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
            current ? 'font-semibold text-text' : 'font-medium text-text-muted'
          }`}
        >
          <TabFace active={!!current} icon={<Ellipsis className="size-5" aria-hidden />} label="More" />
        </button>
        {open && (
          <ul
            id={menuId}
            className="absolute right-2 bottom-full mb-2 w-52 rounded-control border border-border bg-surface p-1.5 shadow-overlay"
          >
            {MORE.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={{ pathname: to, search }}
                  onClick={() => setOpenOn(null)}
                  className={({ isActive }) =>
                    `flex h-11 items-center gap-2.5 rounded-chip px-2.5 text-sm hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary ${
                      isActive ? 'bg-surface-2 font-semibold text-text' : 'text-text'
                    }`
                  }
                >
                  <Icon className="size-4 text-text-muted" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  )
}
