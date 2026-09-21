import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Mail, MoreHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import {
  approveExtensionRequest,
  cancelInvitation,
  getTenancy,
  rejectExtensionRequest,
  resendInvitation,
  startMoveOut,
  updateTenancy,
} from '@/services/tenancy.service'
import {
  createMoveOutInspection,
  listTenancyInspections,
} from '@/services/inspection.service'
import { getErrorMessage } from '@/services/api'
import type { Inspection, PropertyChangeRequest, Tenancy } from '@/types'
import { ConditionManager } from '@/components/handover/ConditionManager'
import { ChangeRequestCard } from '@/components/handover/ChangeRequestCard'
import { TenancyDateCard } from '@/components/tenancy/TenancyDateCard'
import { ExtensionReviewModal } from '@/components/tenancy/ExtensionReviewModal'
import { InvitationLinkCard, InvitationStatusBadge } from '@/components/tenancy/InvitationLinkCard'
import { getInspectionDisplayStatus } from '@/lib/inspectionStatus'
import { formatCurrency } from '@/lib/utils'
import { listChangeRequests } from '@/services/handover.service'
import { useAppPaths } from '@/hooks/useAppPaths'
import {
  DATE_CHANGE_REASONS,
  formatDisplayDate,
  getOccupancyLabel,
  getOwnerAction,
  MOVE_OUT_REASONS,
  OCCUPANCY_OPTIONS,
  toInputDate,
} from '@/lib/tenancyContext'

export function TenancyDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [tenancy, setTenancy] = useState<Tenancy | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [resending, setResending] = useState(false)
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [moveOutOpen, setMoveOutOpen] = useState(false)
  const [editMoveOutOpen, setEditMoveOutOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actualMoveOut, setActualMoveOut] = useState('')
  const [moveOutReason, setMoveOutReason] = useState<string>(MOVE_OUT_REASONS[0])
  const [moveOutNotes, setMoveOutNotes] = useState('')
  const [expectedMoveOut, setExpectedMoveOut] = useState('')
  const [dateChangeReason, setDateChangeReason] = useState<string>(DATE_CHANGE_REASONS[0])
  const [occupancyStatus, setOccupancyStatus] = useState<string>('CURRENTLY_STAYING')
  const [changeRequests, setChangeRequests] = useState<PropertyChangeRequest[]>([])
  const [extensionReviewOpen, setExtensionReviewOpen] = useState(false)
  const [extensionError, setExtensionError] = useState('')
  const [extensionSaving, setExtensionSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [tenancyData, inspectionList, changeData] = await Promise.all([
        getTenancy(id),
        listTenancyInspections(id).catch(() => [] as Inspection[]),
        listChangeRequests(id).catch(() => ({ requests: [] as PropertyChangeRequest[] })),
      ])
      setTenancy(tenancyData)
      setInspections(inspectionList)
      setChangeRequests(changeData.requests)
      setExpectedMoveOut(toInputDate(tenancyData.moveOut))
      setOccupancyStatus(tenancyData.occupancyStatus || 'CURRENTLY_STAYING')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load tenancy'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) void load()
  }, [id])

  if (loading) return <p className="text-sm text-ink-secondary">Loading tenancy...</p>
  if (!tenancy) return <p className="text-sm text-danger">{error || 'Not found'}</p>

  const inviteExpired = Boolean(tenancy.invitationExpired) || tenancy.inviteStatus === 'Expired'
  const inviteLink =
    tenancy.invitationUrl ||
    (tenancy.inviteStatus === 'Pending' && !inviteExpired && tenancy.inviteToken
      ? `${window.location.origin}/invite/${tenancy.inviteToken}`
      : null)
  const moveIn = inspections.find((i) => i.type === 'MOVE_IN')
  const moveOut = inspections.find((i) => i.type === 'MOVE_OUT')
  const action = getOwnerAction(tenancy, inspections, paths)
  const canStartMoveOut =
    Boolean(moveIn && (moveIn.status === 'LOCKED' || (moveIn.ownerApproved && moveIn.tenantApproved))) &&
    !moveOut &&
    ['active', 'move-out'].includes(tenancy.stage)

  const handleExtensionApprove = async () => {
    if (!tenancy.pendingExtension) return
    setExtensionSaving(true)
    setExtensionError('')
    try {
      const data = await approveExtensionRequest(tenancy.pendingExtension.id)
      setTenancy(data.tenancy)
      setExtensionReviewOpen(false)
    } catch (err) {
      setExtensionError(getErrorMessage(err, 'Unable to approve extension'))
    } finally {
      setExtensionSaving(false)
    }
  }

  const handleExtensionReject = async (reason: string) => {
    if (!tenancy.pendingExtension) return
    setExtensionSaving(true)
    setExtensionError('')
    try {
      const data = await rejectExtensionRequest(tenancy.pendingExtension.id, {
        ownerResponse: reason,
      })
      setTenancy(data.tenancy)
      setExtensionReviewOpen(false)
    } catch (err) {
      setExtensionError(getErrorMessage(err, 'Unable to reject extension'))
    } finally {
      setExtensionSaving(false)
    }
  }

  const handleStartMoveOut = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await startMoveOut(tenancy.id, {
        actualMoveOut,
        moveOutReason,
        moveOutNotes,
      })
      setTenancy(updated)
      setMoveOutOpen(false)
      const detail = await createMoveOutInspection(tenancy.id)
      navigate(paths.inspectionWizard(detail.inspection.id))
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to start move-out')
      if (message.includes('already exists') && moveOut) {
        navigate(paths.inspectionWizard(moveOut.id))
        return
      }
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveExpectedMoveOut = async () => {
    setSaving(true)
    setError('')
    try {
      setTenancy(
        await updateTenancy(tenancy.id, {
          moveOut: expectedMoveOut,
          changeReason: dateChangeReason,
        }),
      )
      setEditMoveOutOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update move-out date'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStatus = async () => {
    setSaving(true)
    setError('')
    try {
      setTenancy(await updateTenancy(tenancy.id, { occupancyStatus }))
      setStatusOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update status'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tenancy.propertyName}
        description={`Tenant: ${tenancy.tenantName}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge status={tenancy.status}>{getOccupancyLabel(tenancy)}</Badge>
            <div className="relative">
              <Button variant="tertiary" size="icon" onClick={() => setMenuOpen((v) => !v)}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 z-10 mt-1 w-48 rounded-xl border border-border bg-white p-1 shadow-elevated">
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted"
                    onClick={() => {
                      setEditMoveOutOpen(true)
                      setMenuOpen(false)
                    }}
                  >
                    Update Dates
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted"
                    onClick={() => {
                      setStatusOpen(true)
                      setMenuOpen(false)
                    }}
                  >
                    Update Tenant Status
                  </button>
                  {moveIn ? (
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted"
                      onClick={() => {
                        navigate(paths.inspectionMoveIn(tenancy.id))
                        setMenuOpen(false)
                      }}
                    >
                      View Inspection
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        }
      />

      <TenancyDateCard
        role="OWNER"
        tenantName={tenancy.tenantName}
        moveIn={tenancy.moveIn}
        expectedMoveOut={tenancy.moveOut}
        actualMoveOut={tenancy.actualMoveOut}
        timeline={tenancy.moveOutTimeline}
        pendingExtension={tenancy.pendingExtension}
        onReviewExtension={() => setExtensionReviewOpen(true)}
        onStartMoveOut={
          canStartMoveOut
            ? () => {
                setActualMoveOut(toInputDate(tenancy.moveOut))
                setMoveOutOpen(true)
              }
            : moveOut && ['DRAFT', 'IN_PROGRESS'].includes(moveOut.status)
              ? () => navigate(paths.inspectionWizard(moveOut.id))
              : undefined
        }
        startMoveOutLabel={
          moveOut && ['DRAFT', 'IN_PROGRESS'].includes(moveOut.status)
            ? 'Continue Move-Out'
            : 'Start Move-Out'
        }
        onUpdateDate={() => {
          setExpectedMoveOut(toInputDate(tenancy.moveOut))
          setEditMoveOutOpen(true)
        }}
      />

      <Card>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-ink-muted">Tenant</dt>
            <dd className="mt-1 font-semibold text-ink">{tenancy.tenantName}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Status</dt>
            <dd className="mt-1 font-semibold text-ink">{getOccupancyLabel(tenancy)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Move-In</dt>
            <dd className="mt-1 font-semibold text-ink">{formatDisplayDate(tenancy.moveIn)}</dd>
          </div>
          {moveIn ? (
            <div>
              <dt className="text-ink-muted">Move-In Inspection</dt>
              <dd className="mt-1 font-semibold text-ink">
                {getInspectionDisplayStatus(moveIn).label}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink-muted">Expected Move-Out</dt>
            <dd className="mt-1 font-semibold text-ink">{formatDisplayDate(tenancy.moveOut)}</dd>
          </div>
          {tenancy.actualMoveOut ? (
            <div>
              <dt className="text-ink-muted">Actual Move-Out</dt>
              <dd className="mt-1 font-semibold text-ink">{formatDisplayDate(tenancy.actualMoveOut)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink-muted">Security Deposit</dt>
            <dd className="mt-1 font-semibold text-ink">{formatCurrency(tenancy.deposit)}</dd>
          </div>
        </dl>

        <div className="mt-5 rounded-xl bg-surface-muted px-4 py-3">
          <p className="font-semibold text-ink">{action.title}</p>
          <p className="mt-1 text-sm text-ink-secondary">{action.description}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {action.label && action.path ? (
            <Button onClick={() => navigate(action.path!)}>{action.label}</Button>
          ) : null}
          {canStartMoveOut ? (
            <Button
              variant="secondary"
              onClick={() => {
                setActualMoveOut(toInputDate(tenancy.moveOut))
                setMoveOutOpen(true)
              }}
            >
              Start Move-Out
            </Button>
          ) : null}
          {moveOut && ['DRAFT', 'IN_PROGRESS'].includes(moveOut.status) ? (
            <Button onClick={() => navigate(paths.inspectionWizard(moveOut.id))}>
              Continue Move-Out
            </Button>
          ) : null}
          {moveOut?.status === 'COMPLETED' ? (
            <>
              <Button variant="secondary" onClick={() => navigate(paths.comparison(tenancy.id))}>
                View Comparison
              </Button>
              <Button variant="secondary" onClick={() => navigate(paths.settlement(tenancy.id))}>
                Settlement
              </Button>
            </>
          ) : null}
        </div>
      </Card>

      <ConditionManager tenancyId={tenancy.id} />

      {changeRequests.length > 0 ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">Property Change Requests</h2>
            <Button variant="secondary" onClick={() => navigate(paths.propertyChanges)}>
              Open Property Changes
            </Button>
          </div>
          <ul className="mt-4 space-y-3">
            {changeRequests.slice(0, 4).map((request) => (
              <ChangeRequestCard
                key={request.id}
                request={request}
                onOpen={() => navigate(paths.changeRequest(request.id))}
                ctaLabel={request.status === 'PENDING' ? 'Review Request' : 'View Details'}
              />
            ))}
          </ul>
        </Card>
      ) : null}

      {tenancy.inviteStatus === 'Accepted' ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Invitation Accepted</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            {tenancy.tenantName} has joined this tenancy.
          </p>
          {tenancy.updatedAt ? (
            <p className="mt-3 text-sm text-ink-muted">
              Accepted: {formatDisplayDate(tenancy.updatedAt)}
            </p>
          ) : null}
        </Card>
      ) : null}

      {tenancy.inviteStatus === 'Cancelled' ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Manage Invitation</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            This invitation was cancelled. Invite a tenant again from the Tenancies page if the
            property is available.
          </p>
        </Card>
      ) : null}

      {tenancy.inviteStatus === 'Pending' || tenancy.inviteStatus === 'Expired' ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Manage Invitation</h2>
              <p className="mt-1 text-sm text-ink-secondary">{tenancy.tenantName}</p>
            </div>
            <InvitationStatusBadge status={tenancy.inviteStatus} expired={inviteExpired} />
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Email</dt>
              <dd className="mt-1 font-semibold text-ink">{tenancy.tenantEmail}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Property</dt>
              <dd className="mt-1 font-semibold text-ink">{tenancy.propertyName}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Created</dt>
              <dd className="mt-1 font-semibold text-ink">
                {formatDisplayDate(tenancy.inviteSentAt || tenancy.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Expires</dt>
              <dd className="mt-1 font-semibold text-ink">
                {formatDisplayDate(tenancy.inviteExpiresAt)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Move-In</dt>
              <dd className="mt-1 font-semibold text-ink">{formatDisplayDate(tenancy.moveIn)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Expected Move-Out</dt>
              <dd className="mt-1 font-semibold text-ink">{formatDisplayDate(tenancy.moveOut)}</dd>
            </div>
          </dl>

          <div className="mt-5">
            {inviteExpired ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-ink">Invitation Expired</p>
                <p className="text-sm text-ink-secondary">
                  This invitation link is no longer valid. Generate a new link to invite{' '}
                  {tenancy.tenantName} again.
                </p>
              </div>
            ) : (
              <InvitationLinkCard invitationUrl={inviteLink} />
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={resending}
              onClick={async () => {
                try {
                  setResending(true)
                  setError('')
                  setTenancy(await resendInvitation(tenancy.id))
                } catch (err) {
                  setError(getErrorMessage(err))
                } finally {
                  setResending(false)
                }
              }}
            >
              <Mail className="h-4 w-4" />
              {resending ? 'Generating...' : inviteExpired ? 'Generate New Invitation' : 'Resend Invitation'}
            </Button>
            {tenancy.inviteStatus === 'Pending' && !inviteExpired ? (
              <Button variant="tertiary" onClick={() => setCancelOpen(true)}>
                Cancel Invitation
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="font-bold text-ink">Rental Details</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Monthly Rent</dt>
            <dd className="mt-1 font-semibold">{formatCurrency(tenancy.rent)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="mt-1 font-semibold">{tenancy.tenantPhone || '—'}</dd>
          </div>
        </dl>
      </Card>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Modal
        open={moveOutOpen}
        onClose={() => setMoveOutOpen(false)}
        title="Start Tenant Move-Out?"
        description={`Current expected move-out: ${formatDisplayDate(tenancy.moveOut)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMoveOutOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving || !actualMoveOut} onClick={() => void handleStartMoveOut()}>
              {saving ? 'Starting...' : 'Confirm Move-Out'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Actual / Planned Move-Out Date"
            type="date"
            value={actualMoveOut}
            onChange={(e) => setActualMoveOut(e.target.value)}
          />
          <div>
            <label className="text-sm font-semibold text-ink">Reason</label>
            <select
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
              value={moveOutReason}
              onChange={(e) => setMoveOutReason(e.target.value)}
            >
              {MOVE_OUT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            label="Additional Notes (optional)"
            value={moveOutNotes}
            onChange={(e) => setMoveOutNotes(e.target.value)}
          />
          <p className="text-sm text-ink-secondary">
            Starting move-out will begin the property handover process. Tenant access remains active.
          </p>
        </div>
      </Modal>

      <Modal
        open={editMoveOutOpen}
        onClose={() => setEditMoveOutOpen(false)}
        title="Update Move-Out Date"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditMoveOutOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void handleSaveExpectedMoveOut()}>
              {saving ? 'Saving...' : 'Save Change'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Current date: {formatDisplayDate(tenancy.moveOut)}
          </p>
          <Input
            label="New Expected Move-Out Date"
            type="date"
            value={expectedMoveOut}
            onChange={(e) => setExpectedMoveOut(e.target.value)}
          />
          <div>
            <label className="text-sm font-semibold text-ink">Reason</label>
            <select
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
              value={dateChangeReason}
              onChange={(e) => setDateChangeReason(e.target.value)}
            >
              {DATE_CHANGE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Update Tenant Status"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void handleSaveStatus()}>
              {saving ? 'Saving...' : 'Save Status'}
            </Button>
          </>
        }
      >
        <select
          className="w-full rounded-xl border border-border px-3 py-2 text-sm"
          value={occupancyStatus}
          onChange={(e) => setOccupancyStatus(e.target.value)}
        >
          {OCCUPANCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Tenant Invitation?"
        description={`${tenancy.tenantName} will no longer be able to activate access using this invitation.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep Invitation
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  setTenancy(await cancelInvitation(tenancy.id))
                  setCancelOpen(false)
                } catch (err) {
                  setError(getErrorMessage(err))
                }
              }}
            >
              Cancel Invitation
            </Button>
          </>
        }
      />

      <ExtensionReviewModal
        open={extensionReviewOpen}
        request={tenancy.pendingExtension}
        saving={extensionSaving}
        error={extensionError}
        onClose={() => setExtensionReviewOpen(false)}
        onApprove={handleExtensionApprove}
        onReject={handleExtensionReject}
      />
    </div>
  )
}
