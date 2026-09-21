import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ChangeRequestCard } from '@/components/handover/ChangeRequestCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/context/AuthContext'
import { useAppPaths } from '@/hooks/useAppPaths'
import {
  actionRequiredForRole,
  isAwaitingTenantAcceptance,
  isChangeAuthorized,
} from '@/lib/handoverUi'
import { getErrorMessage } from '@/services/api'
import { createChangeRequest, listChangeRequests, listPendingChangeRequests } from '@/services/handover.service'
import { listTenancies } from '@/services/tenancy.service'
import type { PropertyChangeRequest, Tenancy } from '@/types'

type FilterKey = 'all' | 'action' | 'pending' | 'approved' | 'rejected' | 'completed'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function PropertyChangesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [searchParams, setSearchParams] = useSearchParams()
  const isOwner = user?.role === 'OWNER'
  const tenantTenancyId = user?.role === 'TENANT' ? user.tenantAccess?.tenancyId || '' : ''
  const queryTenancyId = searchParams.get('tenancyId') || ''

  const [tenancies, setTenancies] = useState<Tenancy[]>([])
  const [selectedId, setSelectedId] = useState(queryTenancyId || tenantTenancyId)
  const [propertyName, setPropertyName] = useState('')
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([])
  const [requests, setRequests] = useState<PropertyChangeRequest[]>([])
  const [pendingAcross, setPendingAcross] = useState<PropertyChangeRequest[]>([])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reason, setReason] = useState('')
  const [roomId, setRoomId] = useState('')
  const [commitments, setCommitments] = useState<string[]>([''])
  const [evidenceDataUrl, setEvidenceDataUrl] = useState('')

  const canRequest =
    !isOwner &&
    Boolean(selectedId) &&
    ['active', 'move-out', 'settlement'].includes(user?.tenantAccess?.stage || '')

  const loadRequests = async (tenancyId: string, silent = false) => {
    if (!tenancyId) return
    if (!silent) {
      setLoading(true)
      setLoadError('')
    }
    try {
      const data = await listChangeRequests(tenancyId)
      setPropertyName(data.tenancy.propertyName)
      setRooms(data.rooms)
      setRequests(Array.isArray(data.requests) ? data.requests : [])
    } catch (err) {
      if (!silent) {
        setRequests([])
        setLoadError(getErrorMessage(err, 'Unable to load property changes'))
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (isOwner) {
        try {
          const [list, pending] = await Promise.all([
            listTenancies(),
            listPendingChangeRequests().catch(() => [] as PropertyChangeRequest[]),
          ])
          const active = list.filter((t) => t.inviteStatus === 'Accepted' && t.stage !== 'complete')
          if (cancelled) return
          setTenancies(active)
          setPendingAcross(Array.isArray(pending) ? pending : [])
          const nextId =
            queryTenancyId ||
            pending[0]?.tenancyId ||
            (active.length === 1 ? active[0].id : '')
          setSelectedId(nextId)
          if (nextId) await loadRequests(nextId)
          else setLoading(false)
        } catch (err) {
          if (!cancelled) {
            setRequests([])
            setLoadError(getErrorMessage(err, 'Unable to load property changes'))
            setLoading(false)
          }
        }
      } else if (tenantTenancyId) {
        setSelectedId(tenantTenancyId)
        await loadRequests(tenantTenancyId)
      } else {
        setLoading(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [isOwner, tenantTenancyId, queryTenancyId])

  const openTenancy = (id: string) => {
    setSelectedId(id)
    if (isOwner) setSearchParams({ tenancyId: id })
    void loadRequests(id)
  }

  const openCreateForm = () => {
    setFormError('')
    setCreateOpen(true)
  }

  const role = isOwner ? 'OWNER' : 'TENANT'
  const filtered = useMemo(() => {
    return requests.filter((request) => {
      switch (filter) {
        case 'action':
          return actionRequiredForRole(request, role)
        case 'pending':
          return (
            request.status === 'PENDING' ||
            isAwaitingTenantAcceptance(request.status) ||
            request.status === 'AWAITING_OWNER_FINAL_APPROVAL'
          )
        case 'approved':
          return isChangeAuthorized(request) && request.status !== 'COMPLETED'
        case 'rejected':
          return request.status === 'REJECTED' || request.status === 'CONDITIONS_DECLINED'
        case 'completed':
          return request.status === 'COMPLETED'
        default:
          return true
      }
    })
  }, [requests, filter, role])

  const actionRequired = requests.filter((r) => actionRequiredForRole(r, role))
  const hasAnyRequests = requests.length > 0

  const submitRequest = async () => {
    if (!selectedId) return
    const cleaned = commitments.map((c) => c.trim()).filter((c) => c.length >= 2)
    if (!title.trim() || cleaned.length === 0) {
      setFormError('Add a title and at least one commitment.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const selectedRoom = rooms.find((r) => r.id === roomId)
      const created = await createChangeRequest(selectedId, {
        title: title.trim(),
        description: description.trim(),
        reason: reason.trim(),
        roomId: roomId === 'other' ? '' : roomId,
        roomName: roomId === 'other' ? 'Other' : selectedRoom?.name,
        tenantCommitments: cleaned,
        evidenceDataUrl: evidenceDataUrl || undefined,
      })
      setCreateOpen(false)
      setTitle('')
      setDescription('')
      setReason('')
      setRoomId('')
      setCommitments([''])
      setEvidenceDataUrl('')
      await loadRequests(selectedId, true)
      navigate(paths.changeRequest(created.id))
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to submit request'))
    } finally {
      setSaving(false)
    }
  }

  const requestButton = canRequest ? (
    <Button type="button" className="w-full sm:w-auto" onClick={openCreateForm}>
      <Plus className="h-4 w-4" />
      Request Property Change
    </Button>
  ) : null

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-subtle" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-surface-subtle" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-surface-subtle" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-surface-subtle" />
        <p className="text-sm text-ink-secondary">Loading property changes...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Property Changes"
          description="Request and manage approved modifications for this tenancy."
        />
        <Card>
          <h2 className="text-lg font-bold text-ink">Unable to Load Property Changes</h2>
          <p className="mt-2 text-sm text-ink-secondary">{loadError}</p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => {
              if (selectedId) void loadRequests(selectedId)
              else setLoadError('')
            }}
          >
            Retry
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Changes"
        description={
          isOwner
            ? 'Review structured change requests, propose conditions, and give final approval.'
            : 'Request and manage approved modifications for this tenancy.'
        }
        actions={requestButton}
      />

      {!isOwner && selectedId && !canRequest ? (
        <Card>
          <p className="text-sm text-ink-secondary">
            Property changes will become available after Move-In is completed and your tenancy is
            active.
          </p>
        </Card>
      ) : null}

      {isOwner && pendingAcross.length > 0 ? (
        <Card className="border-warning bg-warning-bg/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Action Required
          </p>
          <h2 className="mt-2 text-lg font-bold text-ink">
            {pendingAcross.length} property change request
            {pendingAcross.length === 1 ? '' : 's'} need
            {pendingAcross.length === 1 ? 's' : ''} your attention.
          </h2>
          <Button
            type="button"
            className="mt-4"
            onClick={() => navigate(paths.changeRequest(pendingAcross[0].id))}
          >
            {pendingAcross[0].status === 'AWAITING_OWNER_FINAL_APPROVAL'
              ? 'Give Final Approval'
              : 'Review Request'}
          </Button>
        </Card>
      ) : null}

      {isOwner && tenancies.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {tenancies.map((tenancy) => (
            <Button
              key={tenancy.id}
              type="button"
              size="sm"
              variant={tenancy.id === selectedId ? 'primary' : 'secondary'}
              onClick={() => openTenancy(tenancy.id)}
            >
              {tenancy.propertyName}
            </Button>
          ))}
        </div>
      ) : null}

      {!selectedId ? (
        <Card>
          <p className="text-sm text-ink-secondary">
            {isOwner
              ? 'Select a tenancy to view property change requests.'
              : 'Property changes are available after your invitation is accepted.'}
          </p>
        </Card>
      ) : (
        <>
          {propertyName ? (
            <p className="text-sm text-ink-secondary">Property: {propertyName}</p>
          ) : null}

          {actionRequired.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-ink">Needs Your Action</h2>
              <ul className="space-y-3">
                {actionRequired.map((request) => (
                  <ChangeRequestCard
                    key={request.id}
                    request={request}
                    onOpen={() => navigate(paths.changeRequest(request.id))}
                    ctaLabel={
                      isOwner
                        ? request.status === 'AWAITING_OWNER_FINAL_APPROVAL'
                          ? 'Give Final Approval'
                          : 'Review Request'
                        : 'Review Conditions'
                    }
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {hasAnyRequests ? (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'All'],
                  ['action', 'Action Required'],
                  ['pending', 'Pending'],
                  ['approved', 'Approved'],
                  ['rejected', 'Rejected'],
                  ['completed', 'Completed'],
                ] as Array<[FilterKey, string]>
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={filter === key ? 'primary' : 'secondary'}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          ) : null}

          <section className="space-y-3">
            {hasAnyRequests ? (
              <h2 className="text-lg font-bold text-ink">
                {isOwner ? 'Requests' : 'Your Requests'}
              </h2>
            ) : null}

            {!hasAnyRequests ? (
              <Card>
                <h2 className="text-lg font-bold text-ink">No Property Changes Yet</h2>
                <p className="mt-2 text-sm text-ink-secondary">
                  {isOwner
                    ? 'No property change requests have been submitted by the Tenant.'
                    : 'No property change requests have been submitted for this tenancy.'}
                </p>
                {canRequest ? <div className="mt-4">{requestButton}</div> : null}
              </Card>
            ) : filtered.length === 0 ? (
              <Card>
                <p className="text-sm text-ink-secondary">
                  No property change requests in this view.
                </p>
              </Card>
            ) : (
              <ul className="space-y-3">
                {filtered.map((request) => (
                  <ChangeRequestCard
                    key={request.id}
                    request={request}
                    onOpen={() => navigate(paths.changeRequest(request.id))}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          setFormError('')
        }}
        title="Request Property Change"
        description="Describe the modification you would like permission to make to the property."
        className="max-w-lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateOpen(false)
                setFormError('')
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void submitRequest()}>
              {saving ? 'Submitting...' : 'Submit Request'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? <p className="text-sm text-danger">{formError}</p> : null}
          <div>
            <p className="text-sm font-semibold text-ink">Property</p>
            <p className="mt-1 text-sm text-ink-secondary">{propertyName || '—'}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-ink" htmlFor="change-request-room">
              Room
            </label>
            <select
              id="change-request-room"
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
              <option value="other">Other</option>
            </select>
          </div>
          <Input
            label="Change Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Install Air Conditioner in Living Room"
          />
          <Textarea
            label="What would you like to change?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="I would like to install a split AC above the living room window."
          />
          <Textarea
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="The living room becomes very hot during the afternoon."
          />
          <div>
            <p className="text-sm font-semibold text-ink">My Commitments</p>
            <p className="mt-1 text-xs text-ink-muted">
              Mention what you agree to do during or before Move-Out if this request is approved.
            </p>
            <div className="mt-3 space-y-2">
              {commitments.map((commitment, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={commitment}
                    onChange={(e) =>
                      setCommitments((prev) =>
                        prev.map((item, i) => (i === index ? e.target.value : item)),
                      )
                    }
                    placeholder="I will remove the AC when I move out."
                  />
                  {commitments.length > 1 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setCommitments((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
            <Button
              type="button"
              className="mt-2"
              variant="secondary"
              size="sm"
              onClick={() => setCommitments((prev) => [...prev, ''])}
            >
              + Add Commitment
            </Button>
          </div>
          <div>
            <label className="text-sm font-semibold text-ink" htmlFor="change-request-evidence">
              Supporting Photos (optional)
            </label>
            <input
              id="change-request-evidence"
              className="mt-2 block w-full text-sm"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                void fileToDataUrl(file).then(setEvidenceDataUrl)
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
