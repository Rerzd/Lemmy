import { useId, useState, type FormEvent } from 'react'
import { Check, CircleAlert } from 'lucide-react'
import { createCategory, updateCategory } from '../../api/categories'
import type { Category, TxType } from '../../types/api'
import { CATEGORY_ICONS, COLOR_SWATCHES, ICON_KEYS, iconLabel } from '../../lib/categoryIcons'
import { getErrorMessage } from '../../lib/errors'
import { inputClass, labelClass } from '../../lib/ui'
import { Button } from '../ui/Button'
import { CategoryIcon } from '../ui/CategoryIcon'
import { Modal } from '../ui/Modal'
import { SegmentedControl } from '../ui/SegmentedControl'

interface CategoryModalProps {
  // null = create a new one.
  category: Category | null
  defaultType: TxType
  onClose: () => void
  onSaved: (category: Category, created: boolean) => void
}

const TYPE_OPTIONS: { value: TxType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

// Mounted only while open, so the form state always starts from the props.
export function CategoryModal({ category, defaultType, onClose, onSaved }: CategoryModalProps) {
  const formId = useId()
  const isEdit = category !== null

  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState<TxType>(category?.type ?? defaultType)
  const [color, setColor] = useState(category?.color ?? COLOR_SWATCHES[0].value)
  const [icon, setIcon] = useState(category?.icon ?? 'tag')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // A color set outside the palette (older data, the API) stays pickable.
  const swatches = COLOR_SWATCHES.some((s) => s.value === color.toLowerCase())
    ? COLOR_SWATCHES
    : [...COLOR_SWATCHES, { value: color, name: 'Current color' }]

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Give the category a name.')

    setError(null)
    setSaving(true)
    const payload = { name: name.trim(), type, color, icon }
    try {
      const saved = isEdit ? await updateCategory(category.id, payload) : await createCategory(payload)
      onSaved(saved, !isEdit)
    } catch (err) {
      // e.g. 409 when changing the type of a category that already has transactions.
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={isEdit ? 'Edit category' : 'Add category'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {isEdit ? 'Save changes' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5">
          <CategoryIcon icon={icon} color={color} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-200">{name.trim() || 'New category'}</p>
            <p className="text-xs text-slate-500 capitalize">{type}</p>
          </div>
        </div>

        <SegmentedControl label="Category type" value={type} options={TYPE_OPTIONS} onChange={setType} className="w-full" />

        <div>
          <label htmlFor={`${formId}-name`} className={labelClass}>
            Name
          </label>
          <input
            id={`${formId}-name`}
            type="text"
            maxLength={50}
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'income' ? 'e.g. Bonus' : 'e.g. Pets'}
            className={inputClass}
          />
        </div>

        <fieldset>
          <legend className={labelClass}>Color</legend>
          <div role="radiogroup" aria-label="Color" className="grid grid-cols-5 justify-items-center gap-1 sm:flex sm:flex-wrap sm:gap-2">
            {swatches.map((swatch) => {
              const selected = swatch.value.toLowerCase() === color.toLowerCase()
              return (
                <button
                  key={swatch.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={swatch.name}
                  title={swatch.name}
                  onClick={() => setColor(swatch.value)}
                  className="group flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-violet-500 sm:size-8"
                >
                  <span
                    className={`flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-slate-900 transition ${
                      selected ? 'ring-2 ring-slate-100' : 'group-hover:scale-110'
                    }`}
                    style={{ backgroundColor: swatch.value }}
                  >
                    {selected && <Check className="size-4 text-slate-950" strokeWidth={3} aria-hidden />}
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className={labelClass}>Icon</legend>
          <div role="radiogroup" aria-label="Icon" className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {ICON_KEYS.map((key) => {
              const Icon = CATEGORY_ICONS[key]
              const selected = key === icon
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={iconLabel(key)}
                  title={iconLabel(key)}
                  onClick={() => setIcon(key)}
                  className={`flex aspect-square items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 ${
                    selected
                      ? 'border-transparent'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                  style={selected ? { backgroundColor: `${color}26`, color, boxShadow: `inset 0 0 0 1.5px ${color}` } : undefined}
                >
                  <Icon className="size-4" aria-hidden />
                </button>
              )
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
