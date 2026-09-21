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
import { acceptConditions, listConditions } from '@/services/handover.service'
import { approveInspection, getInspection } from '@/services/inspection.service'
import type { InspectionDetail, TenancyCondition } from '@/types'
import { ConditionManager } from '@/components/handover/ConditionManager'

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
  const [conditions, setConditions] = useState<TenancyCondition[]>([])
  const [acceptedCheck, setAcceptedCheck] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const load = async (silent = false) => {
    if (!inspectionId) return
    if (!silent) setLoading(true)
    try {
      const data = await getInspection(inspectionId)
      setDetail(data)
      if (data.inspection.tenancyId) {
        const conditionData = await listConditions(data.inspection.tenancyId).catch(() => null)
        setConditions(conditionData?.conditions || [])
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load inspection'))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [inspectionId])

  const inspection = detail?.inspection
  const locked = inspection?.status === 'LOCKED'
  const ownerApproved = Boolean(inspection?.ownerApproved)
  const tenantApproved = Boolean(inspection?.tenantApproved)

  const pendingConditions = conditions.filter(
    (condition) => condition.status === 'DRAFT' || condition.status === 'AMENDMENT_PENDING',
  )
  const conditionsBlockApproval = pendingConditions.some(
    (condition) => condition.isMandatory || condition.requiresTenantAcceptance !== false,
  )

  const canApprove =
    inspection?.status === 'APPROVAL_PENDING' &&
    ((user?.role === 'OWNER' && !ownerApproved && !conditionsBlockApproval) ||
      (user?.role === 'TENANT' && !tenantApproved))

  const handleAcceptConditions = async () => {
    if (!inspection?.tenancyId) return
    setAccepting(true)
    setError('')
    try {
      const data = await acceptConditions(inspection.tenancyId)
      setConditions(data.conditions)
      setAcceptedCheck(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to accept handover conditions'))
    } finally {
      setAccepting(false)
    }
  }

  const handleApprove = async () => {
    if (!inspectionId) return
    setApproving(true)
    setError('')
    try {
      if (user?.role === 'TENANT' && conditionsBlockApproval && inspection?.tenancyId) {
        const data = await acceptConditions(inspection.tenancyId)
        setConditions(data.conditions)
      }
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
                {ownerApproved ? 'Approved ✓' : locked ? '—' : 'Pending'}
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
          <Button
            className="mt-6 w-full"
            onClick={() => setConfirmOpen(true)}
            disabled={user?.role === 'TENANT' && conditionsBlockApproval && !acceptedCheck}
          >
            Approve Inspection
          </Button>
        ) : null}

        {inspection.status === 'APPROVAL_PENDING' &&
        user?.role === 'OWNER' &&
        !ownerApproved &&
        conditionsBlockApproval ? (
          <p className="mt-4 text-sm text-warning">
            The Tenant must accept the handover conditions before this Move-In inspection can be
            approved.
          </p>
        ) : null}

        {!locked && ownerApproved !== tenantApproved ? (
          <p className="mt-4 text-sm text-ink-secondary">
            We&apos;ll notify you when the other party reviews the inspection.
          </p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </Card>

      {user?.role === 'OWNER' && inspection.tenancyId && !locked ? (
        <ConditionManager tenancyId={inspection.tenancyId} onChanged={() => void load(true)} />
      ) : conditions.length ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Conditions Before Moving In</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {conditions.map((condition) => (
              <li key={condition.id}>
                <p className="font-semibold text-ink">
                  {condition.status === 'ACCEPTED' ? '✓ ' : ''}
                  {condition.title}
                  {condition.status === 'DRAFT' || condition.status === 'AMENDMENT_PENDING'
                    ? ' — awaiting Tenant acceptance'
                    : ''}
                </p>
                {condition.description ? (
                  <p className="text-ink-secondary">{condition.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
          {user?.role === 'TENANT' && conditionsBlockApproval ? (
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-2 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acceptedCheck}
                  onChange={(e) => setAcceptedCheck(e.target.checked)}
                />
                I have read and agree to the property handover conditions.
              </label>
              <Button
                variant="secondary"
                disabled={accepting || !acceptedCheck}
                onClick={() => void handleAcceptConditions()}
              >
                {accepting ? 'Accepting...' : 'Accept Handover Conditions'}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {locked ? (
        <Card className="border-brand-200 bg-brand-50/50 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-ink">Move-In Inspection Completed</h2>
          <div className="mt-4 space-y-2 text-sm font-semibold text-ink">
            <p>Owner</p>
            <p>{ownerApproved ? '✓ Approved' : 'Pending'}</p>
            <p className="mt-2">Tenant</p>
            <p>{tenantApproved ? '✓ Approved' : 'Pending'}</p>
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            Completed on:
            <br />
            {inspection.lockedAt ? formatDateTime(inspection.lockedAt) : '—'}
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">
            Status:
            <br />
            Locked
          </p>
          <Button className="mt-6" variant="secondary" onClick={() => navigate(paths.inspections)}>
            Back to Inspections
          </Button>
        </Card>
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Approve Move-In Inspection?"
        description={
          user?.role === 'TENANT' && conditionsBlockApproval
            ? 'This will first accept the handover conditions, then record your approval of the Move-In inspection. Once both parties approve, the inspection will be locked.'
            : 'By approving, you confirm that the recorded property condition represents the agreed Move-In condition. Once both parties approve, the inspection will be locked.'
        }
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
