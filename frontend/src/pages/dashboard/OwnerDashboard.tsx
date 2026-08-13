import { useNavigate } from 'react-router-dom'
import { Building2, CircleAlert, ClipboardCheck, Receipt, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { NextActionCard } from '@/components/shared/NextActionCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useAuth } from '@/context/AuthContext'
import { tenancies } from '@/data/mock'

const summary = [
  { label: 'Properties', value: '4', hint: 'Across Ahmedabad', icon: Building2 },
  { label: 'Active Tenancies', value: '3', hint: 'Active', icon: ClipboardCheck },
  { label: 'Pending Inspections', value: '1', hint: 'Requires Attention', icon: CircleAlert },
  { label: 'Pending Settlements', value: '1', hint: 'Pending Settlement', icon: Receipt },
]

export function OwnerDashboard() {
  const { user, demoMode } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.name.split(' ')[0] || 'there'

  if (demoMode === 'empty') {
    return (
      <div>
        <PageHeader title={`Good morning, ${firstName}`} description="Manage your properties, inspections and tenancy handovers." />
        <EmptyState
          icon={Building2}
          title="Welcome to ReturnReady"
          description="You haven't added any properties yet. Create your first property to start managing inspections and rental handovers."
          actionLabel="+ Add Your First Property"
          onAction={() => navigate('/app/properties/new')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Good morning, ${firstName}`}
        description="Manage your properties, inspections and tenancy handovers."
        actions={
          <Button onClick={() => navigate('/app/properties/new')}>
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-ink-muted">{item.label}</p>
                <p className="mt-2 text-3xl font-bold text-ink">{item.value}</p>
                <p className="mt-1 text-sm text-ink-secondary">{item.hint}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Requires Your Attention</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge status="Awaiting Approval">Awaiting Approval</Badge>
                <h3 className="mt-3 font-bold text-ink">Move-Out Inspection Awaiting Review</h3>
                <p className="mt-1 text-sm text-ink-secondary">Green Residency · B-204</p>
                <p className="mt-1 text-sm text-ink-muted">Tenant: Aaditya Shah</p>
              </div>
            </div>
            <Button className="mt-4" onClick={() => navigate('/app/inspections/comparison')}>
              Review Inspection
            </Button>
          </Card>
          <Card>
            <Badge status="Settlement Pending">Settlement Pending</Badge>
            <h3 className="mt-3 font-bold text-ink">Settlement Awaiting Approval</h3>
            <p className="mt-1 text-sm text-ink-secondary">Orchid Square — 501</p>
            <p className="mt-1 text-sm text-ink-muted">Tenant: Kiran Desai</p>
            <Button className="mt-4" onClick={() => navigate('/app/settlement')}>
              Review Settlement
            </Button>
          </Card>
        </div>
      </section>

      <NextActionCard
        title="Complete damage assessment for Green Residency"
        description="Compare move-in and move-out evidence, then propose fair deductions."
        meta="3 items need review"
        actionLabel="Open Comparison"
        onAction={() => navigate('/app/inspections/comparison')}
      />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Active Tenancies</h2>
          <Button variant="tertiary" size="sm" onClick={() => navigate('/app/tenancies')}>
            View all
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {tenancies.map((tenancy) => (
            <Card key={tenancy.id} interactive>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink">{tenancy.propertyName}</h3>
                  <p className="mt-1 text-sm text-ink-secondary">Tenant: {tenancy.tenantName}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {tenancy.moveIn} – {tenancy.moveOut}
                  </p>
                </div>
                <Badge status={tenancy.status}>{tenancy.status}</Badge>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-ink-secondary">
                  Move-In Inspection{' '}
                  <span className="font-semibold text-success">
                    {tenancy.moveInInspection === 'completed' ? '✓' : '—'}{' '}
                    {tenancy.moveInInspection === 'completed'
                      ? 'Completed'
                      : tenancy.moveInInspection === 'awaiting_approval'
                        ? 'Awaiting Approval'
                        : 'Not Started'}
                  </span>
                </p>
                <p className="text-ink-secondary">
                  Move-Out Inspection —{' '}
                  <span className="font-semibold text-ink">
                    {tenancy.moveOutInspection === 'not_started'
                      ? 'Not Started'
                      : tenancy.moveOutInspection === 'completed'
                        ? 'Completed'
                        : 'In Progress'}
                  </span>
                </p>
                <ProgressBar
                  value={
                    tenancy.stage === 'complete'
                      ? 100
                      : tenancy.stage === 'settlement'
                        ? 80
                        : tenancy.stage === 'active'
                          ? 50
                          : 30
                  }
                  className="pt-2"
                />
              </div>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => navigate(`/app/tenancies/${tenancy.id}`)}
              >
                View Tenancy
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
