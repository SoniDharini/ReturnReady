import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'

const summary = [
  { label: 'Rooms', value: '7/7 completed' },
  { label: 'Inventory', value: '43 items inspected' },
  { label: 'Photos', value: '67 uploaded' },
  { label: 'Existing Issues', value: '3 documented' },
  { label: 'Meter Readings', value: '2 captured' },
  { label: 'Keys', value: '4 recorded' },
]

export function InspectionReviewPage() {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspection Summary"
        description="Review the move-in inspection before submitting for approval."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-ink-muted">{item.label}</p>
            <p className="mt-1 font-bold text-ink">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="border-warning/30 bg-warning-bg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
          <div>
            <p className="font-bold text-ink">2 items are missing photos.</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Add evidence before submitting for a stronger shared record.
            </p>
            <Button variant="secondary" size="sm" className="mt-3">
              Review Missing Items
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate('/app/inspections/wizard')}>
          Continue Editing
        </Button>
        <Button onClick={() => setConfirmOpen(true)}>Submit Inspection</Button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit Move-In Inspection?"
        description="Once both parties approve this inspection, the record will be locked and cannot be silently modified."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false)
                navigate('/app/inspections/approval')
              }}
            >
              Submit Inspection
            </Button>
          </>
        }
      />
    </div>
  )
}
