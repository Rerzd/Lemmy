import { ArrowLeftRight, Calculator, FileChartColumn, LayoutDashboard, Tags, Target, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  // On phones, rarely used pages live under "More" so the bottom bar keeps five 44 px tabs.
  more?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/categories', label: 'Categories', icon: Tags, more: true },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/reports', label: 'Reports', icon: FileChartColumn },
  { to: '/calculators', label: 'Calculators', icon: Calculator, more: true },
]

export function titleForPath(pathname: string): string {
  return NAV_ITEMS.find((item) => item.to === pathname)?.label ?? 'Lemmy'
}
