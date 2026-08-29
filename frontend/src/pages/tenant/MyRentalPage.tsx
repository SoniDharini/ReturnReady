import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Timeline } from '@/components/shared/Timeline'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { useAppPaths } from '@/hooks/useAppPaths'
import { listTenancyInspections } from '@/services/inspection.service'
import type { Inspection } from '@/types'

export function MyRentalPage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const { user } = useAuth()
  const access = user?.tenantAccess
  const [inspections, setInspections] = useState<Inspection[]>([])

  useEffect(() => {
    if (!access?.tenancyId) return
    void listTenancyInspections(access.tenancyId).then(setInspections).catch(() => setInspections([]))
  }, [access?.tenancyId])

  const moveIn = inspections.find((i) => i.type === 'MOVE_IN')
  const moveOut = inspections.find((i) => i.type === 'MOVE_OUT')
  const isActive = moveIn?.status === 'LOCKED'

  const timelineSteps = [
    { id: '1', label: 'Invitation', status: 'complete' as const },
    {
      id: '2',
      label: 'Move-In',
      status: moveIn?.status === 'LOCKED' ? ('complete' as const) : ('current' as const),
    },
    {
      id: '3',
      label: 'Active Rental',
      status: isActive && !moveOut ? ('current' as const) : isActive ? ('complete' as const) : ('upcoming' as const),
    },
    {
      id: '4',
      label: 'Move-Out',
      status:
        moveOut?.status === 'COMPLETED'
          ? ('complete' as const)
          : moveOut
            ? ('current' as const)
            : ('upcoming' as const),
    },
    {
      id: '5',
      label: 'Settlement',
      status: moveOut?.status === 'COMPLETED' ? ('current' as const) : ('upcoming' as const),
    },
    { id: '6', label: 'Complete', status: 'upcoming' as const },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="My Rental" description="Your current tenancy and handover status." />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">{access?.propertyName}</h2>
            <p className="mt-1 text-sm text-ink-secondary">Owner: {access?.ownerName}</p>
          </div>
          <Badge status={isActive ? 'Active' : 'Move-In'}>
            {isActive ? 'Active' : 'Move-In Pending'}
          </Badge>
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
            <dd className="mt-1 font-semibold">
              {moveIn?.status === 'LOCKED'
                ? 'Completed ✓'
                : moveIn?.status === 'APPROVAL_PENDING'
                  ? 'Awaiting Approval'
                  : moveIn
                    ? 'In Progress'
                    : 'Not started'}
            </dd>
          </div>
        </dl>
        {isActive ? (
          <p className="mt-4 text-sm text-ink-secondary">
            Next step: Move-out inspection will become available during handover.
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-ink">Handover Timeline</h2>
        <Timeline steps={timelineSteps} />
      </Card>

      <div className="flex flex-wrap gap-2">
        {moveIn?.status === 'APPROVAL_PENDING' ? (
          <Button onClick={() => navigate(paths.inspectionApproval(moveIn.id))}>
            Approve Move-In Inspection
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => navigate(paths.inspectionMoveIn(access?.tenancyId))}>
          View Inspections
        </Button>
        {moveOut?.status === 'COMPLETED' && access?.tenancyId ? (
          <>
            <Button onClick={() => navigate(paths.comparison(access.tenancyId))}>
              View Comparison
            </Button>
            <Button variant="secondary" onClick={() => navigate(paths.settlement(access.tenancyId))}>
              View Proposed Deductions
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}
