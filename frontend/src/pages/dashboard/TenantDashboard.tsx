import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, CircleDot } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { appPaths } from '@/lib/paths'

export function TenantDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const paths = appPaths('TENANT')
  const firstName = user?.name.split(' ')[0] || 'there'
  const access = user?.tenantAccess

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={`Manage your rental inspection and handover with ${access?.ownerName || 'your property owner'}.`}
      />

      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Your Rental</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">{access?.propertyName}</h2>
            <p className="mt-1 text-sm text-ink-secondary">Owner: {access?.ownerName}</p>
          </div>
          <Badge status="Active">Active</Badge>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-ink-muted">Rental Period</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {access?.moveIn} → {access?.moveOut}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted">Security Deposit</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {formatCurrency(access?.deposit || 0)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted">Status</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">Active Rental</dd>
          </div>
        </dl>
        <Button variant="secondary" className="mt-5" onClick={() => navigate(paths.rental)}>
          View Rental Details
        </Button>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Progress</h2>
        <Card>
          <ol className="space-y-4">
            {[
              { label: 'Invitation Accepted', done: true, current: false },
              { label: 'Move-In Inspection', done: false, current: true },
              { label: 'Active Rental', done: false, current: false },
              { label: 'Move-Out Inspection', done: false, current: false },
              { label: 'Deposit Settlement', done: false, current: false },
              { label: 'Handover Complete', done: false, current: false },
            ].map((step) => (
              <li key={step.label} className="flex items-center gap-3 text-sm">
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : step.current ? (
                  <CircleDot className="h-5 w-5 text-brand-600" />
                ) : (
                  <Circle className="h-5 w-5 text-ink-muted" />
                )}
                <span
                  className={
                    step.done || step.current
                      ? 'font-semibold text-ink'
                      : 'font-medium text-ink-secondary'
                  }
                >
                  {step.label}
                  {step.done ? ' ✓' : ''}
                </span>
                {step.current ? (
                  <Badge tone="info" className="ml-auto">
                    Current
                  </Badge>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <Card className="border-brand-200 bg-brand-50/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Next action</p>
        <h3 className="mt-2 text-lg font-bold text-ink">Wait for move-in inspection</h3>
        <p className="mt-1 text-sm text-ink-secondary">
          Your owner will start the move-in inspection. You&apos;ll be able to review and approve it
          here.
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate(paths.inspections)}>
          View Inspections
        </Button>
      </Card>
    </div>
  )
}
