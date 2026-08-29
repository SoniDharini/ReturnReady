import { Check } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'

type Step = {
  id: string
  label: string
  complete?: boolean
  current?: boolean
}

type InspectionProgressProps = {
  propertyName: string
  steps: Step[]
  currentIndex: number
  percent: number
}

export function InspectionProgress({
  propertyName,
  steps,
  currentIndex,
  percent,
}: InspectionProgressProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-brand-700">Move-In Inspection</p>
        <h2 className="text-xl font-bold text-ink">{propertyName}</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Step {currentIndex + 1} of {steps.length}
        </p>
      </div>
      <ProgressBar value={percent} label="Progress" />
      <nav className="hidden space-y-1 lg:block">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
              step.current && 'bg-brand-50 font-semibold text-brand-800',
              step.complete && !step.current && 'text-ink-secondary',
              !step.complete && !step.current && 'text-ink-muted',
            )}
          >
            {step.complete ? (
              <Check className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  step.current ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-ink-muted',
                )}
              >
                {index + 1}
              </span>
            )}
            <span className="truncate">{step.label}</span>
          </div>
        ))}
      </nav>
    </div>
  )
}
