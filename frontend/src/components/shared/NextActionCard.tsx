import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ArrowRight } from 'lucide-react'

type NextActionCardProps = {
  title: string
  description: string
  meta?: string
  actionLabel: string
  onAction?: () => void
}

export function NextActionCard({ title, description, meta, actionLabel, onAction }: NextActionCardProps) {
  return (
    <Card className="border-brand-200 bg-brand-50/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Next action</p>
          <h3 className="mt-1 text-base font-bold text-ink">{title}</h3>
          <p className="mt-1 text-sm text-ink-secondary">{description}</p>
          {meta ? <p className="mt-2 text-sm font-medium text-ink">{meta}</p> : null}
        </div>
        <Button onClick={onAction} className="shrink-0">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
