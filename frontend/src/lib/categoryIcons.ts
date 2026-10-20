import {
  Briefcase,
  Car,
  Coins,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  PiggyBank,
  ShoppingBag,
  Tag,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'

// Same fixed set as backend/app/core/categories.py.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  briefcase: Briefcase,
  coins: Coins,
  utensils: Utensils,
  car: Car,
  home: House,
  zap: Zap,
  'heart-pulse': HeartPulse,
  film: Film,
  'shopping-bag': ShoppingBag,
  'graduation-cap': GraduationCap,
  gift: Gift,
  'piggy-bank': PiggyBank,
  tag: Tag,
}

export const ICON_KEYS = Object.keys(CATEGORY_ICONS)

// Same hues as the default categories, so new ones sit well next to them.
export const COLOR_SWATCHES = [
  { value: '#10b981', name: 'Emerald' },
  { value: '#14b8a6', name: 'Teal' },
  { value: '#06b6d4', name: 'Cyan' },
  { value: '#3b82f6', name: 'Blue' },
  { value: '#6366f1', name: 'Indigo' },
  { value: '#8b5cf6', name: 'Violet' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#ef4444', name: 'Red' },
  { value: '#f97316', name: 'Orange' },
  { value: '#eab308', name: 'Yellow' },
]

// "heart-pulse" -> "Heart pulse", for labels and tooltips.
export function iconLabel(key: string): string {
  const words = key.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
