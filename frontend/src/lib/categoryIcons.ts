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

export const COLOR_SWATCHES = [
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
]
