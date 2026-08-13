import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Timeline } from '@/components/shared/Timeline'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

export function MyRentalPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <PageHeader title="My Rental" description="Your current tenancy and handover status." />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">Green Residency — B-204</h2>
            <p className="mt-1 text-sm text-ink-secondary">Owner: Rahul Patel</p>
          </div>
          <Badge status="Active">Active</Badge>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-ink-muted">Rental Period</dt>
            <dd className="mt-1 font-semibold">01 Jun 2026 → 31 May 2027</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Security Deposit</dt>
            <dd className="mt-1 font-semibold">{formatCurrency(50000)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Monthly Rent</dt>
            <dd className="mt-1 font-semibold">{formatCurrency(28000)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-ink">Handover Timeline</h2>
        <Timeline
          steps={[
            { id: '1', label: 'Invitation', status: 'complete' },
            { id: '2', label: 'Move-In', status: 'complete' },
            { id: '3', label: 'Active Rental', status: 'current' },
            { id: '4', label: 'Move-Out', status: 'upcoming' },
            { id: '5', label: 'Settlement', status: 'upcoming' },
            { id: '6', label: 'Complete', status: 'upcoming' },
          ]}
        />
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate('/app/inspections/approval')}>Review Move-In Record</Button>
        <Button variant="secondary" onClick={() => navigate('/app/settlement')}>
          Review Deductions
        </Button>
      </div>
    </div>
  )
}
