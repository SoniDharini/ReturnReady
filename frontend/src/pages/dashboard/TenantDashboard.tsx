import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TenancyDateCard } from '@/components/tenancy/TenancyDateCard'
import { ExtensionRequestModal } from '@/components/tenancy/ExtensionRequestModal'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { appPaths } from '@/lib/paths'
import { listTenancyInspections } from '@/services/inspection.service'
import { listChangeRequests } from '@/services/handover.service'
import { createExtensionRequest } from '@/services/tenancy.service'
import { changeStatusLabel, requestHeadline } from '@/lib/handoverUi'
import { getErrorMessage } from '@/services/api'
import type { Inspection, PropertyChangeRequest } from '@/types'
import {
  formatDisplayDate,
  getOccupancyLabel,
  getTenantAction,
} from '@/lib/tenancyContext'

export function TenantDashboard() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const paths = appPaths('TENANT')
  const firstName = user?.name.split(' ')[0] || 'there'
  const access = user?.tenantAccess
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [changeRequests, setChangeRequests] = useState<PropertyChangeRequest[]>([])
  const [extensionOpen, setExtensionOpen] = useState(false)
  const [extensionSaving, setExtensionSaving] = useState(false)
  const [extensionError, setExtensionError] = useState('')

  useEffect(() => {
    if (!access?.tenancyId) return
    void listTenancyInspections(access.tenancyId)
      .then(setInspections)
      .catch(() => setInspections([]))
    void listChangeRequests(access.tenancyId)
      .then((data) => setChangeRequests(data.requests))
      .catch(() => setChangeRequests([]))
  }, [access?.tenancyId])

  const tenancyLike = access
    ? {
        id: access.tenancyId,
        stage: access.stage || 'move-in',
        occupancyStatus: access.occupancyStatus,
        status: access.status === 'ACTIVE' ? 'Active' : access.status,
        actualMoveOut: access.actualMoveOut,
        moveOutReason: access.moveOutReason,
        moveOutTimeline: access.moveOutTimeline,
        moveOut: access.moveOut,
        propertyName: access.propertyName,
      }
    : null

  const action = getTenantAction(tenancyLike, inspections, paths)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Your rental and anything that needs your attention."
      />

      <TenancyDateCard
        role="TENANT"
        moveIn={access?.moveIn}
        expectedMoveOut={access?.moveOut}
        actualMoveOut={access?.actualMoveOut}
        timeline={access?.moveOutTimeline}
        pendingExtension={access?.pendingExtension}
        latestRejectedExtension={access?.latestRejectedExtension}
        onRequestExtension={() => setExtensionOpen(true)}
        onViewTenancy={() => navigate(paths.rental)}
        onViewMoveOut={
          action.path && action.label?.includes('Move-Out')
            ? () => navigate(action.path!)
            : undefined
        }
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

      {(() => {
        const actionRequest =
          changeRequests.find((r) => r.status === 'AWAITING_TENANT_ACCEPTANCE') ||
          changeRequests.find((r) => r.status === 'APPROVED_PENDING_TENANT_ACCEPTANCE') ||
          changeRequests.find((r) => r.status === 'AWAITING_OWNER_FINAL_APPROVAL') ||
          changeRequests.find((r) => r.status === 'AUTHORIZED' || r.status === 'APPROVED') ||
          changeRequests.find((r) => r.status === 'PENDING') ||
          changeRequests[0]
        if (!actionRequest) return null
        const needsAccept =
          actionRequest.status === 'AWAITING_TENANT_ACCEPTANCE' ||
          actionRequest.status === 'APPROVED_PENDING_TENANT_ACCEPTANCE'
        const waitingFinal = actionRequest.status === 'AWAITING_OWNER_FINAL_APPROVAL'
        const authorized =
          actionRequest.status === 'AUTHORIZED' || actionRequest.status === 'APPROVED'
        return (
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Property Change Request
            </p>
            <h3 className="mt-2 text-lg font-bold text-ink">{requestHeadline(actionRequest)}</h3>
            <p className="mt-1 text-sm text-ink-secondary">
              {needsAccept
                ? 'Review Owner conditions for your request.'
                : waitingFinal
                  ? 'Conditions accepted — waiting for Owner final approval.'
                  : authorized
                    ? 'Property Change Approved ✓'
                    : `Status: ${changeStatusLabel(actionRequest.status)}`}
            </p>
            <Button
              className="mt-4"
              variant={needsAccept ? 'primary' : 'secondary'}
              onClick={() => navigate(paths.changeRequest(actionRequest.id))}
            >
              {needsAccept ? 'Review Conditions' : 'View Request'}
            </Button>
          </Card>
        )
      })()}

      <ExtensionRequestModal
        open={extensionOpen}
        currentMoveOut={access?.moveOut}
        saving={extensionSaving}
        error={extensionError}
        onClose={() => setExtensionOpen(false)}
        onSubmit={async (payload) => {
          if (!access?.tenancyId) return
          setExtensionSaving(true)
          setExtensionError('')
          try {
            await createExtensionRequest(access.tenancyId, payload)
            await refreshUser()
            setExtensionOpen(false)
          } catch (err) {
            setExtensionError(getErrorMessage(err, 'Unable to send extension request'))
          } finally {
            setExtensionSaving(false)
          }
        }}
      />
    </div>
  )
}
