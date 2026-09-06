import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { changeStatusLabel, isChangeAuthorized } from '@/lib/handoverUi'
import { formatDisplayDate } from '@/lib/tenancyContext'
import { getErrorMessage } from '@/services/api'
import {
  acceptOwnerConditions,
  approveChangeRequest,
  completeChangeRequest,
  createChangeRequest,
  rejectChangeRequest,
  sendPropertyChangeMessage,
} from '@/services/handover.service'
import { resolveMediaUrl } from '@/services/property.service'
import type { PropertyChangeMessage, PropertyChangeRequest } from '@/types'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function dateKey(value: string) {
  return new Date(value).toDateString()
}

function dateLabel(value: string) {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Today'
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

type ConversationProps = {
  tenancyId: string
  propertyName: string
  ownerName: string
  tenantName: string
  rooms: Array<{ id: string; name: string }>
  messages: PropertyChangeMessage[]
  requests: PropertyChangeRequest[]
  isOwner: boolean
  canRequest: boolean
  currentUserId?: string
  onRefresh: () => Promise<void>
}

export function PropertyChangeConversation({
  tenancyId,
  propertyName,
  ownerName,
  tenantName,
  rooms,
  messages,
  requests,
  isOwner,
  canRequest,
  currentUserId,
  onRefresh,
}: ConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [roomId, setRoomId] = useState(rooms[0]?.id || '')
  const [approveTarget, setApproveTarget] = useState<PropertyChangeRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PropertyChangeRequest | null>(null)
  const [acceptTarget, setAcceptTarget] = useState<PropertyChangeRequest | null>(null)
  const [completeTarget, setCompleteTarget] = useState<PropertyChangeRequest | null>(null)
  const [ownerConditions, setOwnerConditions] = useState('')
  const [ownerNotes, setOwnerNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [completeNote, setCompleteNote] = useState('')
  const [completeEvidence, setCompleteEvidence] = useState('')
  const [saving, setSaving] = useState(false)

  const pendingRequest = requests.find((request) => request.status === 'PENDING')
  const grouped = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: PropertyChangeMessage[] }> = []
    for (const message of messages) {
      const key = dateKey(message.createdAt)
      const last = groups[groups.length - 1]
      if (!last || last.key !== key) {
        groups.push({ key, label: dateLabel(message.createdAt), items: [message] })
      } else {
        last.items.push(message)
      }
    }
    return groups
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (rooms[0] && !roomId) setRoomId(rooms[0].id)
  }, [rooms, roomId])

  const openRequest = () => {
    const lastTenantText = [...messages]
      .reverse()
      .find((m) => m.senderRole === 'TENANT' && m.text)?.text
    setTitle(lastTenantText?.slice(0, 80) || '')
    setSummary(lastTenantText || '')
    setRequestOpen(true)
  }

  const send = async () => {
    if (!draft.trim() && !attachment) return
    setSending(true)
    setError('')
    try {
      await sendPropertyChangeMessage(tenancyId, {
        text: draft.trim() || undefined,
        evidenceDataUrl: attachment || undefined,
      })
      setDraft('')
      setAttachment('')
      await onRefresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send message'))
    } finally {
      setSending(false)
    }
  }

  const submitApproval = async () => {
    if (!title.trim()) {
      setError('Enter a change title.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createChangeRequest(tenancyId, {
        title: title.trim(),
        description: summary.trim(),
        roomId,
        changeType: 'OTHER',
      })
      setRequestOpen(false)
      await onRefresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send approval request'))
    } finally {
      setSaving(false)
    }
  }

  const approve = async () => {
    if (!approveTarget) return
    setSaving(true)
    setError('')
    try {
      await approveChangeRequest(approveTarget.id, { ownerNotes, ownerConditions })
      setApproveTarget(null)
      setOwnerConditions('')
      setOwnerNotes('')
      await onRefresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to approve request'))
    } finally {
      setSaving(false)
    }
  }

  const reject = async () => {
    if (!rejectTarget || rejectionReason.trim().length < 3) {
      setError('Enter a meaningful rejection reason.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await rejectChangeRequest(rejectTarget.id, { reason: rejectionReason.trim(), ownerNotes })
      setRejectTarget(null)
      setRejectionReason('')
      setOwnerNotes('')
      await onRefresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to reject request'))
    } finally {
      setSaving(false)
    }
  }

  const accept = async () => {
    if (!acceptTarget) return
    setSaving(true)
    setError('')
    try {
      await acceptOwnerConditions(acceptTarget.id)
      setAcceptTarget(null)
      await onRefresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to accept conditions'))
    } finally {
      setSaving(false)
    }
  }

  const complete = async () => {
    if (!completeTarget) return
    setSaving(true)
    setError('')
    try {
      await completeChangeRequest(completeTarget.id, {
        note: completeNote || undefined,
        evidenceDataUrl: completeEvidence || undefined,
      })
      setCompleteTarget(null)
      setCompleteNote('')
      setCompleteEvidence('')
      await onRefresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to mark complete'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-border bg-white">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Property Changes
        </p>
        <h2 className="mt-1 text-lg font-bold text-ink">{propertyName}</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Owner: {ownerName} · Tenant: {tenantName}
        </p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
        {grouped.length === 0 ? (
          <p className="text-center text-sm text-ink-muted">
            Start the conversation. Chat is not approval — request approval when you are ready.
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.key}>
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {group.label}
              </p>
              <div className="space-y-3">
                {group.items.map((message) => (
                  <ChatItem
                    key={message.id}
                    message={message}
                    isOwner={isOwner}
                    isMine={Boolean(currentUserId && message.senderId === currentUserId)}
                    onApprove={isOwner ? setApproveTarget : undefined}
                    onReject={isOwner ? setRejectTarget : undefined}
                    onAccept={!isOwner ? setAcceptTarget : undefined}
                    onComplete={!isOwner ? setCompleteTarget : undefined}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="px-5 text-sm text-danger">{error}</p> : null}

      <div className="border-t border-border px-4 py-4">
        {!isOwner && canRequest && !pendingRequest ? (
          <Button className="mb-3" variant="secondary" onClick={openRequest}>
            Request Approval
          </Button>
        ) : null}
        {!isOwner && pendingRequest ? (
          <p className="mb-3 text-sm text-warning">
            An approval request is already awaiting the Owner. Do not proceed yet.
          </p>
        ) : null}
        <div className="flex flex-wrap items-end gap-2">
          <label className="cursor-pointer text-sm font-semibold text-brand-700">
            + Attach
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) setAttachment(await fileToDataUrl(file))
              }}
            />
          </label>
          <textarea
            className="min-h-12 flex-1 rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <Button disabled={sending || (!draft.trim() && !attachment)} onClick={() => void send()}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
        {attachment ? <p className="mt-2 text-xs text-ink-muted">Photo attached</p> : null}
      </div>

      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request Approval"
        description="This creates a formal approval record. Casual chat is not permission."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving || !title.trim()} onClick={() => void submitApproval()}>
              {saving ? 'Sending approval request...' : 'Send Approval Request'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Change Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          {rooms.length ? (
            <Select
              label="Room"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              options={rooms.map((room) => ({ value: room.id, label: room.name }))}
            />
          ) : null}
          <Textarea
            label="Summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Approve this property change?"
        description={
          approveTarget
            ? `Tenant will be allowed to proceed with: ${approveTarget.title}${
                approveTarget.roomName ? ` — ${approveTarget.roomName}` : ''
              }`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void approve()}>
              {saving ? 'Approving request...' : 'Approve'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Owner Conditions (optional)"
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
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject this property change?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={saving || rejectionReason.trim().length < 3}
              onClick={() => void reject()}
            >
              {saving ? 'Rejecting request...' : 'Reject'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <Textarea
            label="Owner Notes"
            value={ownerNotes}
            onChange={(e) => setOwnerNotes(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={!!acceptTarget}
        onClose={() => setAcceptTarget(null)}
        title="Accept Owner Conditions?"
        description="By accepting, you agree to follow these conditions for this property change."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAcceptTarget(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void accept()}>
              {saving ? 'Accepting conditions...' : 'Accept Conditions'}
            </Button>
          </>
        }
      >
        <p className="whitespace-pre-wrap text-sm text-ink-secondary">
          {acceptTarget?.ownerConditions}
        </p>
      </Modal>

      <Modal
        open={!!completeTarget}
        onClose={() => setCompleteTarget(null)}
        title="Mark Change Completed?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleteTarget(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void complete()}>
              {saving ? 'Updating request...' : 'Mark Change Completed'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Completion note"
            value={completeNote}
            onChange={(e) => setCompleteNote(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) setCompleteEvidence(await fileToDataUrl(file))
            }}
          />
        </div>
      </Modal>
    </div>
  )
}

function ChatItem({
  message,
  isOwner,
  isMine,
  onApprove,
  onReject,
  onAccept,
  onComplete,
}: {
  message: PropertyChangeMessage
  isOwner: boolean
  isMine: boolean
  onApprove?: (request: PropertyChangeRequest) => void
  onReject?: (request: PropertyChangeRequest) => void
  onAccept?: (request: PropertyChangeRequest) => void
  onComplete?: (request: PropertyChangeRequest) => void
}) {
  const request = message.request
  if (message.messageType !== 'TEXT' && message.messageType !== 'IMAGE') {
    return (
      <EventCard
        message={message}
        request={request}
        isOwner={isOwner}
        onApprove={onApprove}
        onReject={onReject}
        onAccept={onAccept}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          isMine ? 'bg-brand-600 text-white' : 'bg-surface-muted text-ink'
        }`}
      >
        <p className={`text-xs font-semibold ${isMine ? 'text-white/80' : 'text-ink-muted'}`}>
          {message.senderName || message.senderRole} · {timeLabel(message.createdAt)}
        </p>
        {message.text ? <p className="mt-1 whitespace-pre-wrap">{message.text}</p> : null}
        {message.attachments?.[0]?.fileUrl ? (
          <img
            src={resolveMediaUrl(message.attachments[0].fileUrl)}
            alt="Attachment"
            className="mt-2 max-h-56 w-full rounded-xl object-cover"
          />
        ) : null}
      </div>
    </div>
  )
}

function EventCard({
  message,
  request,
  isOwner,
  onApprove,
  onReject,
  onAccept,
  onComplete,
}: {
  message: PropertyChangeMessage
  request?: PropertyChangeRequest | null
  isOwner: boolean
  onApprove?: (request: PropertyChangeRequest) => void
  onReject?: (request: PropertyChangeRequest) => void
  onAccept?: (request: PropertyChangeRequest) => void
  onComplete?: (request: PropertyChangeRequest) => void
}) {
  if (!request) {
    return (
      <Card className="bg-surface-muted text-sm">
        <p className="font-semibold text-ink">{message.text || message.messageType}</p>
        <p className="mt-1 text-xs text-ink-muted">{timeLabel(message.createdAt)}</p>
      </Card>
    )
  }

  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
        {message.messageType.replaceAll('_', ' ')}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">
            {request.title}
            {request.roomName ? ` — ${request.roomName}` : ''}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Requested {formatDisplayDate(request.requestedAt || request.createdAt)}
          </p>
        </div>
        <Badge
          status={
            request.status === 'APPROVED' || request.status === 'COMPLETED'
              ? 'Approved'
              : request.status === 'REJECTED'
                ? 'Disputed'
                : 'Pending'
          }
        >
          {changeStatusLabel(request.status)}
        </Badge>
      </div>
      {request.description ? (
        <p className="mt-2 text-sm text-ink-secondary">{request.description}</p>
      ) : null}
      {request.ownerConditions ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-secondary">
          Conditions: {request.ownerConditions}
        </p>
      ) : null}
      {request.status === 'REJECTED' && request.ownerNotes ? (
        <p className="mt-2 text-sm text-ink-secondary">Reason: {request.ownerNotes}</p>
      ) : null}
      {request.status === 'PENDING' ? (
        <p className="mt-2 text-sm font-medium text-warning">
          {isOwner
            ? 'Awaiting Your Review'
            : 'Awaiting Owner Approval. Do not proceed with this change yet.'}
        </p>
      ) : null}
      {request.status === 'APPROVED_PENDING_TENANT_ACCEPTANCE' ? (
        <p className="mt-2 text-sm font-medium text-warning">
          Owner approval received. Tenant must accept the conditions before proceeding.
        </p>
      ) : null}
      {isChangeAuthorized(request) ? (
        <p className="mt-2 text-sm font-medium text-success">
          Approved ✓ You may proceed with this property change under the agreed conditions.
        </p>
      ) : null}
      {request.status === 'REJECTED' ? (
        <p className="mt-2 text-sm font-medium text-danger">
          Not Approved. Do not proceed with this property change.
        </p>
      ) : null}
      {message.attachments?.[0]?.fileUrl ? (
        <img
          src={resolveMediaUrl(message.attachments[0].fileUrl)}
          alt=""
          className="mt-3 max-h-48 rounded-xl object-cover"
        />
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {isOwner && request.status === 'PENDING' ? (
          <>
            <Button size="sm" onClick={() => onApprove?.(request)}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onReject?.(request)}>
              Reject
            </Button>
          </>
        ) : null}
        {!isOwner && request.status === 'APPROVED_PENDING_TENANT_ACCEPTANCE' ? (
          <Button size="sm" onClick={() => onAccept?.(request)}>
            Accept Conditions
          </Button>
        ) : null}
        {!isOwner && request.status === 'APPROVED' ? (
          <Button size="sm" variant="secondary" onClick={() => onComplete?.(request)}>
            Mark Change Completed
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
