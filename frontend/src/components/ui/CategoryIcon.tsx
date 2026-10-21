import { CATEGORY_ICONS } from '../../lib/categoryIcons'
import { Tag } from 'lucide-react'

interface CategoryIconProps {
  icon: string
  color: string
  size?: 'sm' | 'md'
}

// Colored tile with the category's icon; unknown keys fall back to "tag".
export function CategoryIcon({ icon, color, size = 'md' }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[icon] ?? Tag
  const box = size === 'sm' ? 'size-7 rounded-chip' : 'size-9 rounded-control'
  const glyph = size === 'sm' ? 'size-3.5' : 'size-4'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${box}`}
      style={{ backgroundColor: `${color}26`, color }}
      aria-hidden
    >
      <Icon className={glyph} />
    </span>
  )
}

export function CategoryChip({ name, icon, color }: { name: string; icon: string; color: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-bg py-0.5 pr-2.5 pl-1 text-xs text-text">
      <CategoryIcon icon={icon} color={color} size="sm" />
      <span className="truncate">{name}</span>
    </span>
  )
}
