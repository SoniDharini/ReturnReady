import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/context/AuthContext'
import { useAppPaths } from '@/hooks/useAppPaths'
import { formatDateTime } from '@/lib/utils'
import { getErrorMessage } from '@/services/api'
import { approveInspection, getInspection } from '@/services/inspection.service'
import type { InspectionDetail } from '@/types'

export function InspectionApprovalPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [searchParams] = useSearchParams()
  const inspectionId = searchParams.get('inspectionId') || ''
  const [detail, setDetail] = useState<InspectionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!inspectionId) return
    setLoading(true)
    try {
      setDetail(await getInspection(inspectionId))
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load inspection'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [inspectionId])

  const inspection = detail?.inspection
  const locked = inspection?.status === 'LOCKED'
  const ownerApproved = Boolean(inspection?.ownerApproved)
  const tenantApproved = Boolean(inspection?.tenantApproved)

  const canApprove =
    inspection?.status === 'APPROVAL_PENDING' &&
    ((user?.role === 'OWNER' && !ownerApproved) ||
      (user?.role === 'TENANT' && !tenantApproved))

  const handleApprove = async () => {
    if (!inspectionId) return
    setApproving(true)
    setError('')
    try {
      const data = await approveInspection(inspectionId)
      setDetail(data)
      setConfirmOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to approve inspection'))
    } finally {
      setApproving(false)
    }
  }

  if (!inspectionId) {
    return <p className="text-sm text-danger">Missing inspection ID.</p>
  }

  if (loading) return <p className="text-sm text-ink-secondary">Loading approval status...</p>
  if (error && !detail) return <p className="text-sm text-danger">{error}</p>
  if (!inspection) return <p className="text-sm text-danger">Inspection not found.</p>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Move-In Inspection Approval"
        description={`${inspection.propertyName} · shared condition record`}
      />

      <Card>
        <h2 className="text-lg font-bold text-ink">Approval Status</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">Owner</p>
                {ownerApproved && inspection.ownerApprovedAt ? (
                  <p className="mt-1 text-xs text-ink-muted">
                    Approved: {formatDateTime(inspection.ownerApprovedAt)}
                  </p>
                ) : null}
              </div>
              <Badge tone={ownerApproved ? 'success' : 'warning'}>
                {ownerApproved ? 'Approved ✓' : 'Pending'}
              </Badge>
            </div>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">Tenant</p>
                {tenantApproved && inspection.tenantApprovedAt ? (
                  <p className="mt-1 text-xs text-ink-muted">
                    Approved: {formatDateTime(inspection.tenantApprovedAt)}
                  </p>
                ) : null}
              </div>
              <Badge tone={tenantApproved ? 'success' : 'warning'}>
                {tenantApproved ? 'Approved ✓' : 'Pending'}
              </Badge>
            </div>
          </div>
        </div>

        {canApprove ? (
          <Button className="mt-6 w-full" onClick={() => setConfirmOpen(true)}>
            Approve Inspection
          </Button>
        ) : null}

        {!locked && ownerApproved !== tenantApproved ? (
          <p className="mt-4 text-sm text-ink-secondary">
            We&apos;ll notify you when the other party reviews the inspection.
          </p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </Card>

      {locked ? (
        <Card className="border-brand-200 bg-brand-50/50 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-ink">Move-In Record Locked</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            This inspection has been approved by both parties and is now the official property
            baseline.
          </p>
          {inspection.lockedAt ? (
            <p className="mt-3 text-sm font-semibold text-ink">{formatDateTime(inspection.lockedAt)}</p>
          ) : null}
          <Button className="mt-6" variant="secondary" onClick={() => navigate(paths.inspections)}>
            Back to Inspections
          </Button>
        </Card>
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Approve Move-In Inspection?"
        description="By approving, you confirm that the recorded property condition represents the agreed Move-In condition. Once both parties approve, the inspection will be locked."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button disabled={approving} onClick={() => void handleApprove()}>
              {approving ? 'Approving...' : 'Approve Inspection'}
            </Button>
          </>
        }
      />
    </div>
  )
}
