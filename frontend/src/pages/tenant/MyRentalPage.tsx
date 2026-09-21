import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TenancyDateCard } from '@/components/tenancy/TenancyDateCard'
import { ExtensionRequestModal } from '@/components/tenancy/ExtensionRequestModal'
import { formatCurrency } from '@/lib/utils'
import { useAppPaths } from '@/hooks/useAppPaths'
import { listTenancyInspections } from '@/services/inspection.service'
import { acceptConditions, listChangeRequests, listConditions } from '@/services/handover.service'
import { createExtensionRequest } from '@/services/tenancy.service'
import { ChangeRequestCard } from '@/components/handover/ChangeRequestCard'
import { getErrorMessage } from '@/services/api'
import type { Inspection, PropertyChangeRequest, TenancyCondition } from '@/types'
import {
  formatDisplayDate,
  getOccupancyLabel,
  getTenantAction,
} from '@/lib/tenancyContext'

export function MyRentalPage() {
  const paths = useAppPaths()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const access = user?.tenantAccess
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [changeRequests, setChangeRequests] = useState<PropertyChangeRequest[]>([])
  const [conditions, setConditions] = useState<TenancyCondition[]>([])
  const [accepting, setAccepting] = useState(false)
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
    void listConditions(access.tenancyId)
      .then((data) => setConditions(data.conditions))
      .catch(() => setConditions([]))
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
      <PageHeader title="My Rental" description="Your current tenancy information." />

      <TenancyDateCard
        role="TENANT"
        moveIn={access?.moveIn}
        expectedMoveOut={access?.moveOut}
        actualMoveOut={access?.actualMoveOut}
        timeline={access?.moveOutTimeline}
        pendingExtension={access?.pendingExtension}
        latestRejectedExtension={access?.latestRejectedExtension}
        onRequestExtension={() => setExtensionOpen(true)}
        onViewMoveOut={
          action.path && action.label?.toLowerCase().includes('move-out')
            ? () => navigate(action.path!)
            : undefined
        }
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">{access?.propertyName}</h2>
            <p className="mt-1 text-sm text-ink-secondary">Owner: {access?.ownerName}</p>
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
              <dt className="text-ink-muted">Reason</dt>
              <dd className="mt-1 font-semibold">{access.moveOutReason}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink-muted">Security Deposit</dt>
            <dd className="mt-1 font-semibold">{formatCurrency(access?.deposit || 0)}</dd>
          </div>
        </dl>
        {access?.actualMoveOut && access.actualMoveOut !== access.moveOut ? (
          <p className="mt-4 text-xs text-ink-muted">Updated by property owner</p>
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
        ) : null}
      </Card>

      {conditions.length ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Property Handover Conditions</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            These are the property handover conditions for this rental.
          </p>
          <ul className="mt-4 space-y-2">
            {conditions.map((condition) => (
              <li key={condition.id} className="rounded-xl bg-surface-muted px-4 py-3">
                <p className="font-semibold text-ink">
                  {condition.status === 'ACCEPTED' ? '✓ ' : ''}
                  {condition.title}
                  {condition.status === 'AMENDMENT_PENDING'
                    ? ' (new amendment)'
                    : condition.status === 'DRAFT'
                      ? ' (awaiting acceptance)'
                      : ''}
                </p>
                {condition.description ? (
                  <p className="mt-1 text-sm text-ink-secondary">{condition.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
          {conditions.some((c) => c.status === 'AMENDMENT_PENDING' || c.status === 'DRAFT') &&
          access?.tenancyId ? (
            <Button
              className="mt-4"
              disabled={accepting}
              onClick={async () => {
                setAccepting(true)
                try {
                  const data = await acceptConditions(access.tenancyId)
                  setConditions(data.conditions)
                } finally {
                  setAccepting(false)
                }
              }}
            >
              {accepting
                ? 'Accepting conditions...'
                : conditions.some((c) => c.status === 'AMENDMENT_PENDING')
                  ? 'Acknowledge New Conditions'
                  : 'Accept Handover Conditions'}
            </Button>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Property Changes</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Request owner permission before installing, removing, or altering anything. Changes
              require mutual agreement and Owner final approval.
            </p>
          </div>
          <Button onClick={() => navigate(paths.propertyChanges)}>
            {changeRequests.length ? 'View Requests' : 'Request a Change'}
          </Button>
        </div>
        {changeRequests.length ? (
          <ul className="mt-4 space-y-3">
            {changeRequests.slice(0, 3).map((request) => (
              <ChangeRequestCard
                key={request.id}
                request={request}
                onOpen={() => navigate(paths.changeRequest(request.id))}
              />
            ))}
          </ul>
        ) : null}
      </Card>

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
