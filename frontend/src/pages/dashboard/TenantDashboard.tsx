import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { appPaths } from '@/lib/paths'
import { listTenancyInspections } from '@/services/inspection.service'
import type { Inspection } from '@/types'
import {
  formatDisplayDate,
  getOccupancyLabel,
  getTenantAction,
} from '@/lib/tenancyContext'

export function TenantDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const paths = appPaths('TENANT')
  const firstName = user?.name.split(' ')[0] || 'there'
  const access = user?.tenantAccess
  const [inspections, setInspections] = useState<Inspection[]>([])

  useEffect(() => {
    if (!access?.tenancyId) return
    void listTenancyInspections(access.tenancyId)
      .then(setInspections)
      .catch(() => setInspections([]))
  }, [access?.tenancyId])

  const tenancyLike = access
    ? {
        id: access.tenancyId,
        stage: access.stage || 'move-in',
        occupancyStatus: access.occupancyStatus,
        status: access.status === 'ACTIVE' ? 'Active' : access.status,
        actualMoveOut: access.actualMoveOut,
        moveOutReason: access.moveOutReason,
      }
    : null

  const action = getTenantAction(tenancyLike, inspections, paths)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Your rental and anything that needs your attention."
      />

      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Your Rental</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">{access?.propertyName || '—'}</h2>
            <p className="mt-1 text-sm text-ink-secondary">Owner: {access?.ownerName || '—'}</p>
          </div>
          <Badge status="Active">{getOccupancyLabel(tenancyLike)}</Badge>
        </div>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Move-In</dt>
            <dd className="mt-1 font-semibold">{formatDisplayDate(access?.moveIn)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Expected Move-Out</dt>
            <dd className="mt-1 font-semibold">{formatDisplayDate(access?.moveOut)}</dd>
          </div>
          {access?.actualMoveOut ? (
            <div>
              <dt className="text-ink-muted">Actual Move-Out</dt>
              <dd className="mt-1 font-semibold">{formatDisplayDate(access.actualMoveOut)}</dd>
            </div>
          ) : null}
          {access?.moveOutReason ? (
            <div>
              <dt className="text-ink-muted">Move-Out Reason</dt>
              <dd className="mt-1 font-semibold">{access.moveOutReason}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink-muted">Security Deposit</dt>
            <dd className="mt-1 font-semibold">{formatCurrency(access?.deposit || 0)}</dd>
          </div>
        </dl>
        {access?.actualMoveOut && access.actualMoveOut !== access.moveOut ? (
          <p className="mt-3 text-xs text-ink-muted">Move-out details updated by property owner</p>
        ) : null}
      </Card>

      <Card className={action.kind === 'action' ? 'border-brand-200 bg-brand-50/40' : ''}>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {action.kind === 'action' ? 'Action required' : 'Status'}
        </p>
        <h3 className="mt-2 text-lg font-bold text-ink">{action.title}</h3>
        <p className="mt-1 text-sm text-ink-secondary">{action.description}</p>
        {action.label && action.path ? (
          <Button className="mt-4" onClick={() => navigate(action.path!)}>
            {action.label}
          </Button>
        ) : (
          <Button className="mt-4" variant="secondary" onClick={() => navigate(paths.rental)}>
            View Rental Details
          </Button>
        )}
      </Card>
    </div>
  )
}
