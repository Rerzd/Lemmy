import { useLocation } from 'react-router-dom'
import { titleForPath } from '../../lib/nav'
import { MonthPicker } from './MonthPicker'
import { ThemeMenu } from './ThemeMenu'

export function TopBar() {
  const { pathname } = useLocation()
  // Categories aren't tied to a month, so the picker would only confuse there.
  const showMonth = pathname !== '/categories'

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-lg font-semibold text-text sm:text-xl">{titleForPath(pathname)}</h1>
        </div>
        <div className="flex items-center gap-1">
          {showMonth && <MonthPicker />}
          <ThemeMenu />
        </div>
      </div>
    </header>
  )
}
