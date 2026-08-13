import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export type TimelineStep = {
  id: string
  label: string
  status: 'complete' | 'current' | 'upcoming'
}

export function Timeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        return (
          <li key={step.id} className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:gap-2">
            <div className="flex items-center sm:w-full">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                  step.status === 'complete' && 'border-brand-600 bg-brand-600 text-white',
                  step.status === 'current' && 'border-brand-600 bg-brand-50 text-brand-700',
                  step.status === 'upcoming' && 'border-border-strong bg-white text-ink-muted',
                )}
                aria-current={step.status === 'current' ? 'step' : undefined}
              >
                {step.status === 'complete' ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              {!isLast ? (
                <div
                  className={cn(
                    'mx-2 hidden h-0.5 flex-1 sm:block',
                    step.status === 'complete' ? 'bg-brand-600' : 'bg-border',
                  )}
                />
              ) : null}
            </div>
            <span
              className={cn(
                'pb-6 text-sm font-semibold sm:pb-0 sm:text-center',
                step.status === 'upcoming' ? 'text-ink-muted' : 'text-ink',
              )}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
