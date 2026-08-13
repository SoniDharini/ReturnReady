import { cn } from '@/lib/utils'

type ProgressBarProps = {
  value: number
  max?: number
  label?: string
  className?: string
}

export function ProgressBar({ value, max = 100, label, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.round((value / max) * 100))

  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-ink-secondary">{label}</span>
          <span className="font-semibold text-ink">{percent}%</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-surface-subtle">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-500"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
