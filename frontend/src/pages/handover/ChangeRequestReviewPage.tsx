import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/context/AuthContext'
import { useAppPaths } from '@/hooks/useAppPaths'
import {
  changeStatusLabel,
  isAwaitingTenantAcceptance,
  isChangeAuthorized,
  ownerConditionList,
  tenantCommitmentList,
  timelineLabel,
} from '@/lib/handoverUi'
import { formatDisplayDate } from '@/lib/tenancyContext'
import { getErrorMessage } from '@/services/api'
import { resolveMediaUrl } from '@/services/property.service'
import {
  acceptOwnerConditions,
  approveWithoutConditions,
  cancelChangeRequest,
  completeChangeRequest,
  declineOwnerConditions,
  finalApproveChangeRequest,
  getChangeRequest,
  rejectChangeRequest,
  sendOwnerConditions,
} from '@/services/handover.service'
import type { PropertyChangeRequest } from '@/types'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ChangeRequestReviewPage() {
  const { requestId = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const paths = useAppPaths()
  const isOwner = user?.role === 'OWNER'

  const [request, setRequest] = useState<PropertyChangeRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [conditionsOpen, setConditionsOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [finalOpen, setFinalOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [acceptedCheck, setAcceptedCheck] = useState(false)
  const [ownerNotes, setOwnerNotes] = useState('')
  const [ownerConditions, setOwnerConditions] = useState<string[]>([''])
  const [rejectionReason, setRejectionReason] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [completeNote, setCompleteNote] = useState('')
  const [completeEvidence, setCompleteEvidence] = useState('')

  const load = async () => {
    if (!requestId) return
    setLoading(true)
    try {
      setRequest(await getChangeRequest(requestId))
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load request'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [requestId])

  if (loading) return <p className="text-sm text-ink-secondary">Loading request...</p>
  if (!request) return <p className="text-sm text-danger">{error || 'Request not found'}</p>

  const commitments = tenantCommitmentList(request)
  const ownerConditionsList = ownerConditionList(request)
  const awaitingTenant = isAwaitingTenantAcceptance(request.status)
  const awaitingFinal = request.status === 'AWAITING_OWNER_FINAL_APPROVAL'
  const authorized = isChangeAuthorized(request)

  const sendConditions = async () => {
    setSaving(true)
    setError('')
    try {
      const cleaned = ownerConditions.map((c) => c.trim()).filter((c) => c.length >= 2)
      if (!cleaned.length) {
        setError('Add at least one condition before sending to the Tenant.')
        return
      }
      setRequest(
        await sendOwnerConditions(request.id, {
          ownerNotes,
          ownerConditionItems: cleaned,
        }),
      )
      setConditionsOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send conditions'))
    } finally {
      setSaving(false)
    }
  }

  const approveDirect = async () => {
    setSaving(true)
    setError('')
    try {
      setRequest(
        await approveWithoutConditions(request.id, {
          ownerNotes: ownerNotes.trim() || undefined,
        }),
      )
      setApproveOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to approve request'))
    } finally {
      setSaving(false)
    }
  }

  const reject = async () => {
    setSaving(true)
    setError('')
    try {
      setRequest(
        await rejectChangeRequest(request.id, {
          reason: rejectionReason.trim(),
        }),
      )
      setRejectOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to reject request'))
    } finally {
      setSaving(false)
    }
  }

  const accept = async () => {
    if (!acceptedCheck) return
    setSaving(true)
    setError('')
    try {
      setRequest(await acceptOwnerConditions(request.id))
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to accept conditions'))
    } finally {
      setSaving(false)
    }
  }

  const decline = async () => {
    setSaving(true)
    setError('')
    try {
      setRequest(
        await declineOwnerConditions(request.id, {
          reason: declineReason.trim() || 'Tenant declined owner conditions',
        }),
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to decline conditions'))
    } finally {
      setSaving(false)
    }
  }

  const finalApprove = async () => {
    setSaving(true)
    setError('')
    try {
      setRequest(await finalApproveChangeRequest(request.id))
      setFinalOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to give final approval'))
    } finally {
      setSaving(false)
    }
  }

  const complete = async () => {
    setSaving(true)
    setError('')
    try {
      setRequest(
        await completeChangeRequest(request.id, {
          note: completeNote,
          evidenceDataUrl: completeEvidence || undefined,
        }),
      )
      setCompleteOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to mark complete'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Property Change Request"
        description={request.propertyName || 'Structured agreement workflow'}
        actions={
          <Button variant="secondary" onClick={() => navigate(paths.propertyChanges)}>
            Back to Property Changes
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">{request.title}</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              {request.roomName ? `Room: ${request.roomName}` : 'Room not specified'}
            </p>
          </div>
          <Badge status={authorized ? 'Approved' : 'Pending'}>
            {changeStatusLabel(request.status)}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Tenant</dt>
            <dd className="font-semibold text-ink">{request.tenantName || '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Owner</dt>
            <dd className="font-semibold text-ink">{request.ownerName || '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Property</dt>
            <dd className="font-semibold text-ink">{request.propertyName || '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Requested</dt>
            <dd className="font-semibold text-ink">
              {formatDisplayDate(request.requestedAt || request.createdAt)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h3 className="font-bold text-ink">Requested Change</h3>
        <p className="mt-2 text-sm text-ink-secondary">{request.description || '—'}</p>
        {request.reason ? (
          <p className="mt-3 text-sm text-ink-secondary">
            <span className="font-semibold text-ink">Reason:</span> {request.reason}
          </p>
        ) : null}
        {request.evidence?.[0]?.fileUrl ? (
          <img
            src={resolveMediaUrl(request.evidence[0].fileUrl)}
            alt=""
            className="mt-4 max-h-64 rounded-xl object-cover"
          />
        ) : null}
      </Card>

      <Card>
        <h3 className="font-bold text-ink">Tenant Commitments</h3>
        {commitments.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {commitments.map((item, index) => (
              <li key={item.id || index} className="rounded-xl bg-surface-muted px-3 py-2">
                ✓ {item.text}
                {item.details ? (
                  <p className="mt-1 text-ink-secondary">{item.details}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-secondary">No commitments recorded.</p>
        )}
      </Card>

      <Card>
        <h3 className="font-bold text-ink">Owner Conditions</h3>
        {ownerConditionsList.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {ownerConditionsList.map((item, index) => (
              <li key={item.id || index} className="rounded-xl bg-surface-muted px-3 py-2">
                {index + 1}. {item.text}
                {item.details ? (
                  <p className="mt-1 text-ink-secondary">{item.details}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-secondary">
            No owner conditions yet. The Owner can approve directly or approve with conditions.
          </p>
        )}
      </Card>

      {(authorized || awaitingFinal || awaitingTenant) && (
        <Card>
          <h3 className="font-bold text-ink">Property Change Agreement</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Tenant Accepted</dt>
              <dd className="font-semibold">
                {request.tenantConditionsAccepted
                  ? `✓ Yes · ${formatDisplayDate(request.tenantConditionsAcceptedAt)}`
                  : 'No'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Owner Final Approval</dt>
              <dd className="font-semibold">
                {request.finalApprovedAt || request.authorizedAt
                  ? `✓ Yes · ${formatDisplayDate(request.finalApprovedAt || request.authorizedAt)}`
                  : awaitingFinal
                    ? 'Waiting'
                    : 'No'}
              </dd>
            </div>
          </dl>
          {authorized ? (
            <p className="mt-3 text-sm font-semibold text-ink">
              You may now proceed with this change according to the agreed conditions.
            </p>
          ) : null}
        </Card>
      )}

      {request.timeline?.length ? (
        <Card>
          <h3 className="font-bold text-ink">Approval History</h3>
          <ol className="mt-3 space-y-3">
            {request.timeline.map((entry, index) => (
              <li key={`${entry.action}-${index}`} className="text-sm">
                <p className="font-semibold text-ink">{timelineLabel(entry.action)}</p>
                <p className="text-ink-muted">{formatDisplayDate(entry.at)}</p>
                {entry.note ? <p className="mt-1 text-ink-secondary">{entry.note}</p> : null}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {request.status === 'REJECTED' || request.status === 'CONDITIONS_DECLINED' ? (
        <Card className="border-danger">
          <h3 className="font-bold text-ink">
            {request.status === 'REJECTED' ? 'Request Rejected' : 'Conditions Declined'}
          </h3>
          <p className="mt-2 text-sm text-ink-secondary">
            {request.rejectionReason || request.ownerNotes || request.ownerResponse || '—'}
          </p>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {isOwner && request.status === 'PENDING' ? (
          <>
            <Button onClick={() => setApproveOpen(true)}>Approve</Button>
            <Button variant="secondary" onClick={() => setConditionsOpen(true)}>
              Approve With Conditions
            </Button>
            <Button variant="secondary" onClick={() => setRejectOpen(true)}>
              Reject
            </Button>
          </>
        ) : null}

        {isOwner && awaitingFinal ? (
          <>
            <Button onClick={() => setFinalOpen(true)}>Approve Change</Button>
            <Button variant="secondary" onClick={() => setRejectOpen(true)}>
              Reject Change
            </Button>
          </>
        ) : null}

        {!isOwner && awaitingTenant ? (
          <Card className="w-full space-y-3">
            <h3 className="font-bold text-ink">Review Owner Conditions</h3>
            <p className="text-sm text-ink-secondary">
              The Owner approved your request with conditions. Accept them to finalize the
              agreement, or decline if you do not agree.
            </p>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptedCheck}
                onChange={(e) => setAcceptedCheck(e.target.checked)}
              />
              <span>I have read and agree to all Owner conditions.</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!acceptedCheck || saving} onClick={() => void accept()}>
                Accept Conditions
              </Button>
              <Button variant="secondary" disabled={saving} onClick={() => void decline()}>
                Decline Conditions
              </Button>
            </div>
            <Textarea
              label="Decline reason (optional)"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </Card>
        ) : null}

        {!isOwner && request.status === 'AWAITING_OWNER_FINAL_APPROVAL' ? (
          <Card className="w-full">
            <p className="font-semibold text-ink">Conditions Accepted</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Waiting for Owner Final Approval. You cannot proceed until the Owner authorizes this
              change.
            </p>
          </Card>
        ) : null}

        {!isOwner && (request.status === 'AUTHORIZED' || request.status === 'APPROVED') ? (
          <Button onClick={() => setCompleteOpen(true)}>Mark Change Completed</Button>
        ) : null}

        {!isOwner && request.status === 'PENDING' ? (
          <Button
            variant="secondary"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              try {
                setRequest(await cancelChangeRequest(request.id))
              } catch (err) {
                setError(getErrorMessage(err, 'Unable to cancel'))
              } finally {
                setSaving(false)
              }
            }}
          >
            Cancel Request
          </Button>
        ) : null}
      </div>

      {request.status === 'COMPLETED' ? (
        <Card>
          <h3 className="font-bold text-ink">Completion</h3>
          <p className="mt-2 text-sm text-ink-secondary">
            {request.completionNotes || 'Marked completed'}
          </p>
          {request.completionEvidence?.[0]?.fileUrl ? (
            <img
              src={resolveMediaUrl(request.completionEvidence[0].fileUrl)}
              alt=""
              className="mt-3 max-h-56 rounded-xl object-cover"
            />
          ) : null}
        </Card>
      ) : null}

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve Property Change?"
        description="Approve this request without additional conditions. The Tenant will be authorized to proceed immediately."
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void approveDirect()}>
              {saving ? 'Approving...' : 'Approve'}
            </Button>
          </>
        }
      >
        <Textarea
          label="Optional notes for Tenant"
          value={ownerNotes}
          onChange={(e) => setOwnerNotes(e.target.value)}
          placeholder="You may proceed with the installation as described."
        />
      </Modal>

      <Modal
        open={conditionsOpen}
        onClose={() => setConditionsOpen(false)}
        title="Approve With Conditions"
        description="Add requirements the Tenant must accept before this change is officially authorized."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConditionsOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void sendConditions()}>
              {saving ? 'Sending...' : 'Send Conditions to Tenant'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {ownerConditions.map((condition, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={condition}
                onChange={(e) =>
                  setOwnerConditions((prev) =>
                    prev.map((item, i) => (i === index ? e.target.value : item)),
                  )
                }
                placeholder="Repair drilling holes before Move-Out."
              />
              {ownerConditions.length > 1 ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setOwnerConditions((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOwnerConditions((prev) => [...prev, ''])}
          >
            + Add Condition
          </Button>
          <Textarea
            label="Optional notes"
            value={ownerNotes}
            onChange={(e) => setOwnerNotes(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={finalOpen}
        onClose={() => setFinalOpen(false)}
        title="Give Final Approval?"
        description="The Tenant has accepted all conditions. Approving this request will authorize the Tenant to proceed with the property change."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFinalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void finalApprove()}>
              {saving ? 'Approving...' : 'Approve Change'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-secondary">
          This is the final authorization step. Until you approve, the change remains unauthorized.
        </p>
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Change"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={saving || rejectionReason.trim().length < 3}
              onClick={() => void reject()}
            >
              Reject
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Exterior wall drilling is not permitted."
        />
      </Modal>

      <Modal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Mark Change Completed"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void complete()}>
              {saving ? 'Saving...' : 'Mark Completed'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Completion Notes"
            value={completeNote}
            onChange={(e) => setCompleteNote(e.target.value)}
            placeholder="AC has been installed above the living room window."
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              void fileToDataUrl(file).then(setCompleteEvidence)
            }}
          />
        </div>
      </Modal>
    </div>
  )
}
