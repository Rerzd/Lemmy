import { ArrowLeftRight, LayoutDashboard, Tags, Target, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/budgets', label: 'Budgets', icon: Target },
]

export function titleForPath(pathname: string): string {
  return NAV_ITEMS.find((item) => item.to === pathname)?.label ?? 'Lemmy'
}
