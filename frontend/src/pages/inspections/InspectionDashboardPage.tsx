import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, CircleDot } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { rooms } from '@/data/mock'
import { cn } from '@/lib/utils'

export function InspectionDashboardPage() {
  const navigate = useNavigate()
  const completed = rooms.filter((r) => r.inspectionStatus === 'completed').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Move-In Inspection"
        description="Green Residency — B-204"
        actions={
          <Button onClick={() => navigate('/app/inspections/wizard')}>Continue Inspection</Button>
        }
      />

      <Card>
        <ProgressBar value={completed} max={rooms.length} label={`${completed} of ${rooms.length} rooms completed`} />
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => navigate('/app/inspections/wizard')}
            className={cn(
              'flex items-center gap-3 rounded-2xl border border-border bg-white p-4 text-left shadow-card transition-shadow hover:shadow-elevated',
            )}
          >
            {room.inspectionStatus === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            ) : room.inspectionStatus === 'in_progress' ? (
              <CircleDot className="h-5 w-5 shrink-0 text-brand-600" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-ink-muted" />
            )}
            <div>
              <p className="font-bold text-ink">{room.name}</p>
              <p className="text-sm text-ink-secondary">
                {room.inspectionStatus === 'completed'
                  ? 'Completed'
                  : room.inspectionStatus === 'in_progress'
                    ? 'In Progress'
                    : 'Not Started'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
