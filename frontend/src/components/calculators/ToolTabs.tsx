import { useRef, type KeyboardEvent } from 'react'
import { panelId, tabId, TOOLS, type ToolId } from '../../lib/calculators/tools'

/**
 * ARIA tabs with roving focus: only the selected tab is in the Tab order, and
 * Arrow keys, Home and End move between tabs (selection follows focus). On phones
 * the row scrolls sideways inside its own box instead of widening the page.
 */
export function ToolTabs({ value, onChange }: { value: ToolId; onChange: (id: ToolId) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKeyDown = (e: KeyboardEvent) => {
    const index = TOOLS.findIndex((t) => t.id === value)
    const next =
      e.key === 'ArrowRight' ? (index + 1) % TOOLS.length
      : e.key === 'ArrowLeft' ? (index - 1 + TOOLS.length) % TOOLS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? TOOLS.length - 1
      : null
    if (next === null) return
    e.preventDefault()
    select(TOOLS[next].id)
    refs.current[TOOLS[next].id]?.focus()
  }

  // On phones the row scrolls, so bring the chosen tab fully into view.
  const select = (id: ToolId) => {
    onChange(id)
    refs.current[id]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="tablist" aria-label="Calculators" onKeyDown={onKeyDown} className="inline-flex min-w-full gap-1 rounded-control border border-border bg-surface p-1 sm:min-w-0">
        {TOOLS.map((tool) => {
          const selected = tool.id === value
          return (
            <button
              key={tool.id}
              ref={(el) => {
                refs.current[tool.id] = el
              }}
              type="button"
              role="tab"
              id={tabId(tool.id)}
              aria-selected={selected}
              aria-controls={panelId(tool.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tool.id)}
              className={`flex min-h-11 shrink-0 items-center rounded-chip px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:min-h-9 ${
                selected ? 'bg-primary text-primary-contrast' : 'text-text-muted hover:bg-surface-2 hover:text-text'
              }`}
            >
              {tool.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
