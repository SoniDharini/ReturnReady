import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { ROOM_MAX } from '@/lib/propertyRooms'

type QuantityStepperProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
  disabled?: boolean
}

export function QuantityStepper({
  label,
  value,
  onChange,
  min = 0,
  max = ROOM_MAX,
  className,
  disabled,
}: QuantityStepperProps) {
  const decrease = () => onChange(Math.max(min, value - 1))
  const increase = () => onChange(Math.min(max, value + 1))

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border border-border bg-white px-4 py-3',
        className,
      )}
    >
      {label ? <span className="text-sm font-semibold text-ink">{label}</span> : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={decrease}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          aria-label={label}
          onChange={(e) => {
            const next = Number(e.target.value)
            if (Number.isNaN(next)) return
            onChange(Math.max(min, Math.min(max, next)))
          }}
          className="h-11 w-14 rounded-xl border border-border bg-surface-muted text-center text-sm font-bold text-ink focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={increase}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
