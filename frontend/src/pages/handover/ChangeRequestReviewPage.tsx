import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/context/AuthContext'
import { useAppPaths } from '@/hooks/useAppPaths'
import { changeStatusLabel, changeTypeLabel } from '@/lib/handoverUi'
import { formatDisplayDate } from '@/lib/tenancyContext'
import { getErrorMessage } from '@/services/api'
import { resolveMediaUrl } from '@/services/property.service'
import {
  acceptOwnerConditions,
  approveChangeRequest,
  cancelChangeRequest,
  completeChangeRequest,
  getChangeRequest,
  rejectChangeRequest,
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
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [ownerNotes, setOwnerNotes] = useState('')
  const [ownerConditions, setOwnerConditions] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
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

  const approve = async () => {
    if (!request) return
    setSaving(true)
    setError('')
    try {
      setRequest(await approveChangeRequest(request.id, { ownerNotes, ownerConditions }))
      setApproveOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to approve request'))
    } finally {
      setSaving(false)
    }
  }

  const reject = async () => {
    if (!request) return
    if (rejectionReason.trim().length < 3) {
      setError('Enter a meaningful rejection reason.')
      return
    }
    setSaving(true)
    setError('')
    try {
      setRequest(
        await rejectChangeRequest(request.id, {
          ownerNotes,
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

  const cancel = async () => {
    if (!request) return
    setSaving(true)
    setError('')
    try {
      setRequest(await cancelChangeRequest(request.id))
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to cancel request'))
    } finally {
      setSaving(false)
    }
  }

  const complete = async () => {
    if (!request) return
    setSaving(true)
    setError('')
    try {
      setRequest(
        await completeChangeRequest(request.id, {
          note: completeNote || undefined,
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

  if (loading) return <p className="text-sm text-ink-secondary">Loading request...</p>
  if (error && !request) return <p className="text-sm text-danger">{error}</p>
  if (!request) return <p className="text-sm text-danger">Request not found.</p>

  const evidence = request.evidence?.[0]?.fileUrl

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Property Change Request"
        description={`${request.roomName || 'Property'} · ${changeTypeLabel(request.changeType)}`}
        actions={<Badge status={request.status === 'PENDING' ? 'Pending' : 'Active'}>{changeStatusLabel(request.status)}</Badge>}
      />

      <Card>
        <dl className="space-y-3 text-sm">
          {request.propertyName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Property</dt>
              <dd className="font-semibold text-ink text-right">{request.propertyName}</dd>
            </div>
          ) : null}
          {isOwner && request.tenantName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Tenant</dt>
              <dd className="font-semibold text-ink">{request.tenantName}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Requested change</dt>
            <dd className="font-semibold text-ink text-right">{request.title}</dd>
          </div>
          {request.roomName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Room</dt>
              <dd className="font-semibold text-ink">{request.roomName}</dd>
            </div>
          ) : null}
          {request.description ? (
            <div>
              <dt className="text-ink-muted">Description</dt>
              <dd className="mt-1 text-ink-secondary">{request.description}</dd>
            </div>
          ) : null}
          {request.reason ? (
            <div>
              <dt className="text-ink-muted">Reason</dt>
              <dd className="mt-1 text-ink-secondary">{request.reason}</dd>
            </div>
          ) : null}
        </dl>
        {evidence ? (
          <img
            src={resolveMediaUrl(evidence)}
            alt="Request evidence"
            className="mt-4 max-h-64 w-full rounded-xl object-cover"
          />
        ) : null}
      </Card>

      {request.status === 'PENDING' && !isOwner ? (
        <Card className="border-warning bg-warning-bg/30">
          <h2 className="font-semibold text-ink">Pending Approval</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Do not make this property change until the Owner approves it.
          </p>
        </Card>
      ) : null}

      {request.status === 'APPROVED_PENDING_TENANT_ACCEPTANCE' ? (
        <Card className="border-warning bg-warning-bg/30">
          <h2 className="font-semibold text-ink">Owner Approved With Conditions</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            You must accept the conditions before this change is authorized.
          </p>
          {request.ownerConditions ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-secondary">
              {request.ownerConditions}
            </p>
          ) : null}
          {!isOwner ? (
            <Button
              className="mt-3"
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                try {
                  setRequest(await acceptOwnerConditions(request.id))
                } catch (err) {
                  setError(getErrorMessage(err, 'Unable to accept conditions'))
                } finally {
                  setSaving(false)
                }
              }}
            >
              {saving ? 'Accepting conditions...' : 'Accept Conditions'}
            </Button>
          ) : null}
        </Card>
      ) : null}

      {request.status === 'APPROVED' ? (
        <Card className="border-brand-200 bg-brand-50/40">
          <h2 className="font-semibold text-ink">Approved</h2>
          <p className="mt-1 text-sm text-ink-secondary">You may proceed with this change.</p>
          {request.ownerConditions ? (
            <p className="mt-2 text-sm text-ink-secondary">
              Owner condition: {request.ownerConditions}
            </p>
          ) : null}
        </Card>
      ) : null}

      {request.status === 'REJECTED' ? (
        <Card className="border-danger/30 bg-danger-bg/10">
          <h2 className="font-semibold text-ink">Not Approved</h2>
          <p className="mt-1 text-sm text-ink-secondary">Do not proceed with this change.</p>
          {request.ownerNotes ? (
            <p className="mt-2 text-sm text-ink-secondary">{request.ownerNotes}</p>
          ) : null}
        </Card>
      ) : null}

      {request.timeline?.length ? (
        <Card>
          <h2 className="font-bold text-ink">History</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {request.timeline.map((item, index) => (
              <li key={`${item.action}-${index}`} className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                <div>
                  <p className="font-semibold text-ink">
                    {item.action.replaceAll('_', ' ')} · {formatDisplayDate(item.at)}
                  </p>
                  {item.note ? <p className="text-ink-secondary">{item.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {isOwner && request.status === 'PENDING' ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setApproveOpen(true)}>Approve</Button>
          <Button variant="secondary" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
        </div>
      ) : null}

      {!isOwner && request.status === 'PENDING' ? (
        <Button variant="secondary" disabled={saving} onClick={() => void cancel()}>
          {saving ? 'Updating request...' : 'Cancel Request'}
        </Button>
      ) : null}

      {!isOwner && request.status === 'APPROVED' ? (
        <Button onClick={() => setCompleteOpen(true)}>Mark Change Complete</Button>
      ) : null}

      <Button variant="tertiary" onClick={() => navigate(paths.propertyChanges)}>
        Back to Property Changes
      </Button>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve Property Change?"
        description={`${request.title}${request.roomName ? ` — ${request.roomName}` : ''} will be permitted.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void approve()}>
              {saving ? 'Approving request...' : 'Approve Request'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Optional Owner Conditions"
            value={ownerConditions}
            onChange={(e) => setOwnerConditions(e.target.value)}
            placeholder="Tenant must remove the AC and repair drilling holes before Move-Out."
          />
          <Textarea
            label="Owner Notes"
            value={ownerNotes}
            onChange={(e) => setOwnerNotes(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Property Change?"
        description="The official property record will stay unchanged."
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
              {saving ? 'Rejecting request...' : 'Reject Request'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Exterior drilling is not permitted."
          />
          <Textarea
            label="Owner Notes"
            value={ownerNotes}
            onChange={(e) => setOwnerNotes(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Mark Change Completed?"
        description="Upload optional after-change evidence. This does not change the locked Move-In record."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void complete()}>
              {saving ? 'Updating request...' : 'Mark Change Complete'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Completion note"
            value={completeNote}
            onChange={(e) => setCompleteNote(e.target.value)}
            placeholder="Change completed. AC installed and wall patched."
          />
          <div>
            <label className="text-sm font-semibold text-ink">After-change evidence</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) setCompleteEvidence(await fileToDataUrl(file))
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
