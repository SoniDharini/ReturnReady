import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Timeline } from '@/components/shared/Timeline'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { useAppPaths } from '@/hooks/useAppPaths'
import { useNavigate } from 'react-router-dom'

export function MyRentalPage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const { user } = useAuth()
  const access = user?.tenantAccess

  return (
    <div className="space-y-6">
      <PageHeader title="My Rental" description="Your current tenancy and handover status." />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">{access?.propertyName}</h2>
            <p className="mt-1 text-sm text-ink-secondary">Owner: {access?.ownerName}</p>
          </div>
          <Badge status="Active">Active Rental</Badge>
        </div>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-ink-muted">Rental Period</dt>
            <dd className="mt-1 font-semibold">
              {access?.moveIn} → {access?.moveOut}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Security Deposit</dt>
            <dd className="mt-1 font-semibold">{formatCurrency(access?.deposit || 0)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Move-In Inspection</dt>
            <dd className="mt-1 font-semibold text-ink-secondary">Not started</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-ink">Handover Timeline</h2>
        <Timeline
          steps={[
            { id: '1', label: 'Invitation', status: 'complete' },
            { id: '2', label: 'Move-In', status: 'current' },
            { id: '3', label: 'Active Rental', status: 'upcoming' },
            { id: '4', label: 'Move-Out', status: 'upcoming' },
            { id: '5', label: 'Settlement', status: 'upcoming' },
            { id: '6', label: 'Complete', status: 'upcoming' },
          ]}
        />
      </Card>

      <Button variant="secondary" onClick={() => navigate(paths.inspections)}>
        View Inspections
      </Button>
    </div>
  )
}
