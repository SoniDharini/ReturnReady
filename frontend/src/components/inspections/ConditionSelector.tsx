import type { InspectionCondition } from '@/types'
import { cn } from '@/lib/utils'

const CONDITIONS: Array<{ value: InspectionCondition; label: string; hint: string }> = [
  { value: 'EXCELLENT', label: 'Excellent', hint: 'No visible issue' },
  { value: 'GOOD', label: 'Good', hint: 'Normal condition' },
  { value: 'FAIR', label: 'Fair', hint: 'Minor wear' },
  { value: 'DAMAGED', label: 'Damaged', hint: 'Significant damage' },
  { value: 'MISSING', label: 'Missing', hint: 'Not present' },
]

type ConditionSelectorProps = {
  value?: InspectionCondition | null
  onChange: (value: InspectionCondition) => void
  disabled?: boolean
}

export function ConditionSelector({ value, onChange, disabled }: ConditionSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {CONDITIONS.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-xl border px-3 py-3 text-left transition-colors',
              selected
                ? 'border-brand-600 bg-brand-50 text-brand-800'
                : 'border-border bg-white text-ink hover:border-border-strong hover:bg-surface-muted',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <p className="text-sm font-bold">{option.label}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{option.hint}</p>
          </button>
        )
      })}
    </div>
  )
}
