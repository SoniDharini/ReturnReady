import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { formatDisplayDate } from '@/lib/tenancyContext'
import type { TenancyExtensionRequest } from '@/types'

type ExtensionReviewModalProps = {
  open: boolean
  request?: TenancyExtensionRequest | null
  saving?: boolean
  error?: string
  onClose: () => void
  onApprove: () => Promise<void> | void
  onReject: (reason: string) => Promise<void> | void
}

export function ExtensionReviewModal({
  open,
  request,
  saving,
  error,
  onClose,
  onApprove,
  onReject,
}: ExtensionReviewModalProps) {
  const [rejectReason, setRejectReason] = useState('')
  const [mode, setMode] = useState<'review' | 'reject'>('review')

  if (!request) return null

  return (
    <Modal
      open={open}
      onClose={() => {
        setMode('review')
        setRejectReason('')
        onClose()
      }}
      title="Review Extension Request"
      description="Approve a later Move-Out date or keep the current schedule."
      footer={
        mode === 'reject' ? (
          <>
            <Button variant="secondary" onClick={() => setMode('review')}>
              Back
            </Button>
            <Button
              disabled={saving || rejectReason.trim().length < 3}
              onClick={() => void onReject(rejectReason.trim())}
            >
              {saving ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setMode('reject')}>
              Reject
            </Button>
            <Button disabled={saving} onClick={() => void onApprove()}>
              {saving ? 'Approving...' : 'Approve Extension'}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-3 text-sm">
        <div>
          <p className="font-semibold text-ink">Current Expected Move-Out</p>
          <p className="text-ink-secondary">{formatDisplayDate(request.currentMoveOutDate)}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Requested Move-Out</p>
          <p className="text-ink-secondary">{formatDisplayDate(request.requestedMoveOutDate)}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Tenant Reason</p>
          <p className="text-ink-secondary">{request.reason}</p>
        </div>
        {mode === 'reject' ? (
          <Textarea
            label="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why the extension cannot be approved."
          />
        ) : null}
        {error ? <p className="text-danger">{error}</p> : null}
      </div>
    </Modal>
  )
}
