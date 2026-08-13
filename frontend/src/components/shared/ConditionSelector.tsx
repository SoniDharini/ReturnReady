import { cn } from '@/lib/utils'

export const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Damaged', 'Missing'] as const
export type Condition = (typeof CONDITIONS)[number]

const conditionStyles: Record<Condition, string> = {
  Excellent: 'border-success text-success bg-success-bg',
  Good: 'border-brand-600 text-brand-700 bg-brand-50',
  Fair: 'border-warning text-warning bg-warning-bg',
  Damaged: 'border-danger text-danger bg-danger-bg',
  Missing: 'border-danger text-danger bg-danger-bg',
}

type ConditionSelectorProps = {
  value?: Condition | null
  onChange: (value: Condition) => void
}

export function ConditionSelector({ value, onChange }: ConditionSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Condition">
      {CONDITIONS.map((condition) => {
        const selected = value === condition
        return (
          <button
            key={condition}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(condition)}
            className={cn(
              'min-h-12 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors',
              selected
                ? conditionStyles[condition]
                : 'border-border bg-white text-ink-secondary hover:border-border-strong hover:bg-surface-muted',
            )}
          >
            {condition}
          </button>
        )
      })}
    </div>
  )
}
