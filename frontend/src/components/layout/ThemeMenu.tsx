import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import type { ThemePreference } from '../../lib/theme'

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const item =
  'flex h-11 w-full items-center gap-2.5 rounded-chip px-2.5 text-left text-sm text-text hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary sm:h-9'

// Theme picker in the top bar. On phones it also holds Sign out, so the bar keeps room for the title.
export function ThemeMenu() {
  const { preference, resolved, setPreference } = useTheme()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[2]
  // The button shows the theme in use, so "System" still tells you whether it's light or dark.
  const TriggerIcon = resolved === 'dark' ? Moon : Sun

  useEffect(() => {
    if (!open) return
    // Focus the checked option when the menu opens.
    menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    const onPointer = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) trigger.current?.focus()
  }

  const onMenuKey = (e: KeyboardEvent) => {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])].filter((el) => el.offsetParent !== null)
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
    } else if (e.key === 'Tab') {
      close(false)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[next]?.focus()
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      items[e.key === 'Home' ? 0 : items.length - 1]?.focus()
    }
  }

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Theme: ${current.label}`}
        title={`Theme: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="flex size-11 items-center justify-center rounded-chip text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-9"
      >
        <TriggerIcon className="size-4" aria-hidden />
      </button>

      {open && (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label="Theme"
          onKeyDown={onMenuKey}
          className="absolute top-full right-0 z-40 mt-2 w-48 rounded-control border border-border bg-surface p-1.5 shadow-overlay"
        >
          <p className="px-2.5 pt-1 pb-1.5 text-xs font-medium text-text-muted" aria-hidden>
            Theme
          </p>
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={preference === value}
              tabIndex={-1}
              onClick={() => {
                setPreference(value)
                close(true)
              }}
              className={item}
            >
              <Icon className="size-4 text-text-muted" aria-hidden />
              <span className="flex-1">{label}</span>
              {preference === value && <Check className="size-4 text-primary-text" aria-hidden />}
            </button>
          ))}
          <div className="sm:hidden">
            <div className="my-1.5 border-t border-border" role="separator" />
            <button type="button" role="menuitem" tabIndex={-1} onClick={logout} className={item}>
              <LogOut className="size-4 text-text-muted" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
