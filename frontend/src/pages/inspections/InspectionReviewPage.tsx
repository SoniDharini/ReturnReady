import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAppPaths } from '@/hooks/useAppPaths'
import { getErrorMessage } from '@/services/api'
import {
  getInspectionReview,
  resolveInspectionImageUrl,
  submitInspection,
} from '@/services/inspection.service'
import type { InspectionReview } from '@/types'

export function InspectionReviewPage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [searchParams] = useSearchParams()
  const inspectionId = searchParams.get('inspectionId') || ''
  const [review, setReview] = useState<InspectionReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!inspectionId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await getInspectionReview(inspectionId)
        if (!cancelled) {
          setReview(data)
          if (data.inspection.status === 'APPROVAL_PENDING') setSubmitted(true)
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load review'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [inspectionId])

  const handleSubmit = async () => {
    if (!inspectionId) return
    setSubmitting(true)
    setError('')
    try {
      const data = await submitInspection(inspectionId)
      setReview((prev) => (prev ? { ...prev, ...data, canSubmit: false } : prev))
      setSubmitted(true)
      setConfirmOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to submit inspection'))
    } finally {
      setSubmitting(false)
    }
  }

  const isMoveOut = review?.inspection.type === 'MOVE_OUT'

  if (!inspectionId) return <p className="text-sm text-danger">Missing inspection ID.</p>
  if (loading) return <p className="text-sm text-ink-secondary">Loading review...</p>
  if (error && !review) return <p className="text-sm text-danger">{error}</p>
  if (!review) return <p className="text-sm text-danger">Review not available.</p>

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-ink">
            {isMoveOut ? 'Move-Out Inspection Submitted' : 'Move-In Inspection Submitted'}
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            <span className="font-semibold text-ink">{review.inspection.propertyName}</span>{' '}
            {isMoveOut
              ? 'is ready for comparison.'
              : 'is now awaiting approval from both parties.'}
          </p>
          {!isMoveOut ? (
            <div className="mt-4 space-y-2 text-sm text-ink-secondary">
              <p>
                Owner:{' '}
                <Badge status={review.inspection.ownerApproved ? 'Approved' : 'Pending'}>
                  {review.inspection.ownerApproved ? 'Approved' : 'Pending'}
                </Badge>
              </p>
              <p>
                Tenant:{' '}
                <Badge status={review.inspection.tenantApproved ? 'Approved' : 'Pending'}>
                  {review.inspection.tenantApproved ? 'Approved' : 'Pending'}
                </Badge>
              </p>
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {isMoveOut ? (
              <Button
                onClick={() =>
                  navigate(paths.comparison(review.inspection.tenancyId))
                }
              >
                View Comparison
              </Button>
            ) : (
              <Button onClick={() => navigate(paths.inspectionApproval(inspectionId))}>
                Go to Approval
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(paths.inspections)}>
              Back to Inspections
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={isMoveOut ? 'Review Move-Out Inspection' : 'Review Move-In Inspection'}
        description={
          isMoveOut
            ? 'Review move-out conditions before submitting for comparison.'
            : 'Review the property condition record before submitting it for approval.'
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Rooms Inspected', value: `${review.roomCompletion.filter((r) => r.isComplete).length} / ${review.roomCompletion.length}` },
          { label: 'Items Inspected', value: `${review.progress.completedItems} / ${review.progress.totalItems}` },
          { label: 'Photos Uploaded', value: String(review.progress.evidenceCount) },
          { label: 'Existing Issues', value: String(review.issues.length) },
          { label: 'Meter Readings', value: String(review.progress.meterCount) },
          { label: 'Keys / Access Items', value: String(review.progress.accessItemCount) },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-ink-muted">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-ink">{stat.value}</p>
          </Card>
        ))}
      </div>

      {review.incomplete.length > 0 ? (
        <Card>
          <h2 className="font-bold text-ink">Items Requiring Attention</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {review.incomplete.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-muted px-3 py-2">
                <span>
                  <span className="font-semibold text-ink">{item.roomName}</span> — {item.itemName}
                  {!item.condition ? ' — Condition not selected' : ' — Issue description required'}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(paths.inspectionWizard(inspectionId))}
                >
                  Review Item
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {review.issues.length > 0 ? (
        <Card>
          <h2 className="font-bold text-ink">Existing Issues</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {review.issues.map((item) => (
              <li key={item.id} className="rounded-xl bg-surface-muted px-3 py-2">
                <p className="font-semibold text-ink">
                  {item.roomName} — {item.itemName}
                </p>
                <p className="text-xs font-semibold uppercase text-warning">{item.condition}</p>
                <p className="text-ink-secondary">{item.issueDescription || item.notes}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="font-bold text-ink">Rooms</h2>
        <div className="mt-3 space-y-2">
          {review.roomCompletion.map((room) => (
            <div
              key={room.roomId}
              className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
            >
              <span className="font-semibold text-ink">{room.roomName}</span>
              <Badge status={room.isComplete ? 'Completed' : 'In Progress'}>
                {room.isComplete ? 'Completed ✓' : `${room.completed}/${room.total}`}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {review.meters.length > 0 ? (
        <Card>
          <h2 className="font-bold text-ink">Meter Readings</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {review.meters.map((meter) => (
              <li key={meter.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-muted px-3 py-2">
                <span className="font-semibold text-ink">
                  {meter.type === 'OTHER' ? meter.customTypeName : meter.type}
                </span>
                <span>
                  {meter.reading} {meter.unit}
                </span>
                {meter.imageUrl ? (
                  <img
                    src={resolveInspectionImageUrl(meter.imageUrl)}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {review.accessItems.length > 0 ? (
        <Card>
          <h2 className="font-bold text-ink">Keys & Access</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {review.accessItems.map((item) => (
              <li key={item.id} className="flex justify-between rounded-xl bg-surface-muted px-3 py-2">
                <span className="font-semibold text-ink">{item.name}</span>
                <span>{item.quantity}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => navigate(paths.inspectionWizard(inspectionId))}>
          Back & Edit
        </Button>
        <Button disabled={!review.canSubmit || submitting} onClick={() => setConfirmOpen(true)}>
          {isMoveOut ? 'Submit Move-Out Inspection' : 'Submit Move-In Inspection'}
        </Button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={isMoveOut ? 'Submit Move-Out Inspection?' : 'Submit Move-In Inspection?'}
        description={
          isMoveOut
            ? 'Please confirm all move-out conditions, photos, meter readings, and keys are correct. After submission, the comparison will be generated.'
            : 'Please make sure all property conditions, photos, meter readings, and access items are correct. After submission, the inspection will move to the approval stage.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submitting} onClick={() => void handleSubmit()}>
              {submitting ? 'Submitting...' : 'Submit Inspection'}
            </Button>
          </>
        }
      />
    </div>
  )
}
