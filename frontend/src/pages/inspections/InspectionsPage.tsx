import { useNavigate } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useAuth } from '@/context/AuthContext'

export function InspectionsPage() {
  const navigate = useNavigate()
  const { demoMode, user } = useAuth()

  if (demoMode === 'empty') {
    return (
      <div>
        <PageHeader title="Inspections" description="Move-in and move-out inspection records." />
        <EmptyState
          icon={ClipboardCheck}
          title="No inspections yet"
          description="Inspections appear here once a tenancy is active and a handover begins."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspections"
        description="Document property condition with photos, notes, and approvals."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge status="Completed">Locked</Badge>
              <h3 className="mt-3 text-lg font-bold text-ink">Move-In Inspection</h3>
              <p className="mt-1 text-sm text-ink-secondary">Green Residency — B-204</p>
            </div>
          </div>
          <ProgressBar value={7} max={7} label="7 of 7 rooms completed" className="mt-4" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/app/inspections/approval')}>
              View Record
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge status="In Progress">In Progress</Badge>
              <h3 className="mt-3 text-lg font-bold text-ink">Move-Out Inspection</h3>
              <p className="mt-1 text-sm text-ink-secondary">Green Residency — B-204</p>
            </div>
          </div>
          <ProgressBar value={4} max={7} label="4 of 7 rooms completed" className="mt-4" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => navigate('/app/inspections/move-out')}>
              {user?.role === 'tenant' ? 'Continue Inspection' : 'Continue Inspection'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/app/inspections/comparison')}>
              Compare
            </Button>
          </div>
        </Card>

        <Card>
          <Badge status="Awaiting Approval">Awaiting Approval</Badge>
          <h3 className="mt-3 text-lg font-bold text-ink">Move-In Inspection</h3>
          <p className="mt-1 text-sm text-ink-secondary">Lakeview Heights — 12A</p>
          <p className="mt-1 text-sm text-ink-muted">Tenant: Meera Joshi</p>
          <Button className="mt-4" onClick={() => navigate('/app/inspections/approval')}>
            Review & Approve
          </Button>
        </Card>
      </div>
    </div>
  )
}
