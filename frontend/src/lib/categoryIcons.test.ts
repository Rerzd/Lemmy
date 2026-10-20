import { describe, expect, it } from 'vitest'
import { CATEGORY_ICONS, COLOR_SWATCHES, ICON_KEYS, iconLabel } from './categoryIcons'
import { BUDGET_STATUS } from './budgetStatus'
import { CHART_COLORS } from './chartColors'

const HEX = /^#[0-9a-f]{6}$/

describe('category palette', () => {
  it('has 10 distinct, named swatches the API accepts', () => {
    expect(COLOR_SWATCHES).toHaveLength(10)
    expect(new Set(COLOR_SWATCHES.map((s) => s.value)).size).toBe(10)
    for (const swatch of COLOR_SWATCHES) {
      expect(swatch.value).toMatch(HEX)
      expect(swatch.name).not.toBe('')
    }
  })

  it('knows the same 14 icon keys as backend/app/core/categories.py', () => {
    expect(ICON_KEYS).toEqual([
      'wallet', 'briefcase', 'coins', 'utensils', 'car', 'home', 'zap',
      'heart-pulse', 'film', 'shopping-bag', 'graduation-cap', 'gift', 'piggy-bank', 'tag',
    ])
    expect(ICON_KEYS.every((key) => CATEGORY_ICONS[key])).toBe(true)
  })

  it('turns icon keys into readable labels', () => {
    expect(iconLabel('heart-pulse')).toBe('Heart pulse')
    expect(iconLabel('tag')).toBe('Tag')
  })
})

describe('status and chart colors', () => {
  it('gives every budget status its own label, icon and color', () => {
    const entries = Object.values(BUDGET_STATUS)
    expect(Object.keys(BUDGET_STATUS)).toEqual(['ok', 'warning', 'over'])
    for (const key of ['label', 'icon', 'bar', 'text'] as const) {
      expect(new Set(entries.map((e) => e[key])).size).toBe(entries.length)
    }
  })

  it('keeps chart colors as hex values and income distinct from expense', () => {
    for (const value of Object.values(CHART_COLORS)) expect(value).toMatch(HEX)
    expect(CHART_COLORS.income).not.toBe(CHART_COLORS.expense)
  })
})
