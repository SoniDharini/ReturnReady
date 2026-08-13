import { useNavigate, useParams } from 'react-router-dom'
import { Timeline } from '@/components/shared/Timeline'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { tenancies } from '@/data/mock'
import { formatCurrency } from '@/lib/utils'

export function TenancyDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const tenancy = tenancies.find((t) => t.id === id) || tenancies[0]

  const stageOrder = ['invitation', 'move-in', 'active', 'move-out', 'settlement', 'complete'] as const
  const currentIndex = stageOrder.indexOf(tenancy.stage)

  const steps = [
    { id: '1', label: 'Invitation' },
    { id: '2', label: 'Move-In' },
    { id: '3', label: 'Active Rental' },
    { id: '4', label: 'Move-Out' },
    { id: '5', label: 'Settlement' },
    { id: '6', label: 'Complete' },
  ].map((step, index) => ({
    ...step,
    status:
      index < currentIndex ? ('complete' as const) : index === currentIndex ? ('current' as const) : ('upcoming' as const),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={tenancy.propertyName}
        description={`Tenant: ${tenancy.tenantName}`}
        actions={<Badge status={tenancy.status}>{tenancy.status}</Badge>}
      />

      <Card>
        <h2 className="mb-4 text-lg font-bold text-ink">Tenancy Timeline</h2>
        <Timeline steps={steps} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-bold text-ink">Rental Details</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-ink-muted">Period</dt>
              <dd className="mt-1 font-semibold">
                {tenancy.moveIn} → {tenancy.moveOut}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Monthly Rent</dt>
              <dd className="mt-1 font-semibold">{formatCurrency(tenancy.rent)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Security Deposit</dt>
              <dd className="mt-1 font-semibold">{formatCurrency(tenancy.deposit)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Tenant Email</dt>
              <dd className="mt-1 font-semibold">{tenancy.tenantEmail}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="font-bold text-ink">Next Action</h2>
          {tenancy.stage === 'settlement' ? (
            <>
              <p className="mt-2 text-sm text-ink-secondary">Deposit settlement is ready for review.</p>
              <Button className="mt-4 w-full" onClick={() => navigate('/app/settlement')}>
                Review Settlement
              </Button>
            </>
          ) : tenancy.stage === 'move-in' ? (
            <>
              <p className="mt-2 text-sm text-ink-secondary">Approve the move-in inspection record.</p>
              <Button className="mt-4 w-full" onClick={() => navigate('/app/inspections/approval')}>
                Review Inspection
              </Button>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-secondary">Continue the active rental handover workflow.</p>
              <Button className="mt-4 w-full" onClick={() => navigate('/app/inspections')}>
                View Inspections
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
