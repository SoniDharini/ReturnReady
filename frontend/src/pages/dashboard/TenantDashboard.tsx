import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, CircleDot } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { NextActionCard } from '@/components/shared/NextActionCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { Home } from 'lucide-react'

export function TenantDashboard() {
  const { user, demoMode } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.name.split(' ')[0] || 'there'

  if (demoMode === 'empty') {
    return (
      <div>
        <PageHeader title={`Welcome back, ${firstName}`} description="Your rental handover workspace." />
        <EmptyState
          icon={Home}
          title="No rental yet"
          description="When a landlord invites you to a tenancy, it will appear here."
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Track your rental, inspections, and deposit settlement."
      />

      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Your Rental</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">Green Residency — B-204</h2>
            <p className="mt-1 text-sm text-ink-secondary">Owner: Rahul Patel</p>
          </div>
          <Badge status="Active">Active</Badge>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-ink-muted">Rental Period</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">01 Jun 2026 → 31 May 2027</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted">Security Deposit</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{formatCurrency(50000)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted">Monthly Rent</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{formatCurrency(28000)}</dd>
          </div>
        </dl>
        <Button variant="secondary" className="mt-5" onClick={() => navigate('/app/my-rental')}>
          View Rental Details
        </Button>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Inspection Progress</h2>
        <Card>
          <ol className="space-y-4">
            <li className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-semibold text-ink">Move-In Inspection</span>
              <Badge tone="success" className="ml-auto">
                Completed
              </Badge>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <CircleDot className="h-5 w-5 text-brand-600" />
              <span className="font-semibold text-ink">Active Rental</span>
              <Badge tone="info" className="ml-auto">
                Current
              </Badge>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <Circle className="h-5 w-5 text-ink-muted" />
              <span className="font-medium text-ink-secondary">Move-Out Inspection</span>
              <Badge tone="neutral" className="ml-auto">
                Not Started
              </Badge>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <Circle className="h-5 w-5 text-ink-muted" />
              <span className="font-medium text-ink-secondary">Final Settlement</span>
              <Badge tone="neutral" className="ml-auto">
                Pending
              </Badge>
            </li>
          </ol>
        </Card>
      </section>

      <NextActionCard
        title="Your Move-In Inspection is ready for review"
        description="Confirm the documented condition so the record can be locked."
        actionLabel="Review Inspection"
        onAction={() => navigate('/app/inspections/approval')}
      />

      <Card>
        <h3 className="font-bold text-ink">3 deductions need your review</h3>
        <p className="mt-1 text-sm text-ink-secondary">
          Review proposed deposit deductions with move-in and move-out evidence.
        </p>
        <Button className="mt-4" onClick={() => navigate('/app/settlement')}>
          Review Deductions
        </Button>
      </Card>
    </div>
  )
}
