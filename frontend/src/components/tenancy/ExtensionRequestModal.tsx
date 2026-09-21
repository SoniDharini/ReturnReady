import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { formatDisplayDate } from '@/lib/tenancyContext'

type ExtensionRequestModalProps = {
  open: boolean
  currentMoveOut?: string
  saving?: boolean
  error?: string
  onClose: () => void
  onSubmit: (payload: { requestedMoveOutDate: string; reason: string }) => Promise<void> | void
}

export function ExtensionRequestModal({
  open,
  currentMoveOut,
  saving,
  error,
  onClose,
  onSubmit,
}: ExtensionRequestModalProps) {
  const [requestedMoveOutDate, setRequestedMoveOutDate] = useState('')
  const [reason, setReason] = useState('')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request Extension"
      description="Send a new expected Move-Out date to the Owner for review."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving || !requestedMoveOutDate || reason.trim().length < 3}
            onClick={() => void onSubmit({ requestedMoveOutDate, reason: reason.trim() })}
          >
            {saving ? 'Sending...' : 'Send Extension Request'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink">Current Expected Move-Out</p>
          <p className="mt-1 text-sm text-ink-secondary">{formatDisplayDate(currentMoveOut)}</p>
        </div>
        <Input
          label="Requested New Move-Out Date"
          type="date"
          value={requestedMoveOutDate}
          onChange={(e) => setRequestedMoveOutDate(e.target.value)}
        />
        <Textarea
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="I need additional time because my new accommodation will only be available later."
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Modal>
  )
}
