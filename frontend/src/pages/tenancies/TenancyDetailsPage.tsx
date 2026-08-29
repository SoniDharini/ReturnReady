import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Copy, Mail } from 'lucide-react'
import { Timeline } from '@/components/shared/Timeline'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import {
  cancelInvitation,
  getTenancy,
  resendInvitation,
} from '@/services/tenancy.service'
import {
  createMoveOutInspection,
  listTenancyInspections,
} from '@/services/inspection.service'
import { getErrorMessage } from '@/services/api'
import type { Inspection, Tenancy } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { useAppPaths } from '@/hooks/useAppPaths'

export function TenancyDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [tenancy, setTenancy] = useState<Tenancy | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [startingMoveOut, setStartingMoveOut] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [tenancyData, inspectionList] = await Promise.all([
        getTenancy(id),
        listTenancyInspections(id).catch(() => [] as Inspection[]),
      ])
      setTenancy(tenancyData)
      setInspections(inspectionList)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load tenancy'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) void load()
  }, [id])

  if (loading) return <p className="text-sm text-ink-secondary">Loading tenancy...</p>
  if (error || !tenancy) return <p className="text-sm text-danger">{error || 'Not found'}</p>

  const stageOrder = ['invitation', 'move-in', 'active', 'move-out', 'settlement', 'complete'] as const
  const currentIndex = stageOrder.indexOf(tenancy.stage)
  const steps = [
    { id: '1', label: 'Invitation' },
    { id: '2', label: 'Move-In' },
    { id: '3', label: 'Active Rental' },
    { id: '4', label: 'Move-Out' },
    { id: '5', label: 'Settlement' },
    { id: '6', label: 'Complete' },
  ].map((step, index) => ({
    ...step,
    status:
      index < currentIndex
        ? ('complete' as const)
        : index === currentIndex
          ? ('current' as const)
          : ('upcoming' as const),
  }))

  const inviteLink = `${window.location.origin}/invite/${tenancy.inviteToken}`
  const moveIn = inspections.find((i) => i.type === 'MOVE_IN')
  const moveOut = inspections.find((i) => i.type === 'MOVE_OUT')
  const isActiveStage = ['active', 'move-out', 'settlement', 'complete'].includes(tenancy.stage)

  const startMoveOut = async () => {
    setStartingMoveOut(true)
    setError('')
    try {
      const detail = await createMoveOutInspection(tenancy.id)
      navigate(paths.inspectionWizard(detail.inspection.id))
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to start move-out inspection')
      if (message.includes('already exists') && moveOut) {
        navigate(paths.inspectionWizard(moveOut.id))
        return
      }
      setError(message)
    } finally {
      setStartingMoveOut(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tenancy.propertyName}
        description={`Tenant: ${tenancy.tenantName}`}
        actions={<Badge status={tenancy.status}>{tenancy.status}</Badge>}
      />

      <Card>
        <h2 className="mb-4 text-lg font-bold text-ink">Tenancy Timeline</h2>
        <Timeline steps={steps} />
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-ink">Tenant Invitation</h2>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xl font-bold text-ink">{tenancy.tenantName}</p>
            <p className="mt-1 text-sm text-ink-secondary">{tenancy.propertyName}</p>
            <p className="mt-2 text-sm">
              <span className="text-ink-muted">Email: </span>
              <a
                className="font-semibold text-brand-700 hover:underline"
                href={`mailto:${tenancy.tenantEmail}`}
              >
                {tenancy.tenantEmail}
              </a>
            </p>
            <p className="mt-1 text-sm text-ink-muted">Sent: {tenancy.inviteSentAt}</p>
          </div>
          <Badge status={tenancy.inviteStatus === 'Accepted' ? 'Approved' : 'Invitation Sent'}>
            {tenancy.inviteStatus === 'Accepted' ? 'Tenant Joined ✓' : 'Invitation Sent'}
          </Badge>
        </div>

        {tenancy.inviteStatus === 'Pending' ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  setTenancy(await resendInvitation(tenancy.id))
                } catch (err) {
                  setError(getErrorMessage(err))
                }
              }}
            >
              <Mail className="h-4 w-4" />
              Resend Invitation
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteLink)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy Invitation Link'}
            </Button>
            <Button variant="tertiary" onClick={() => setCancelOpen(true)}>
              Cancel Invitation
            </Button>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {!moveIn ? (
              <Button onClick={() => navigate(paths.inspectionMoveIn(tenancy.id))}>
                Start Move-In Inspection
              </Button>
            ) : moveIn.status === 'APPROVAL_PENDING' ? (
              <Button onClick={() => navigate(paths.inspectionApproval(moveIn.id))}>
                Review Move-In Approval
              </Button>
            ) : ['DRAFT', 'IN_PROGRESS'].includes(moveIn.status) ? (
              <Button onClick={() => navigate(paths.inspectionWizard(moveIn.id))}>
                Continue Move-In Inspection
              </Button>
            ) : moveIn.status === 'LOCKED' ? (
              <Badge status="Completed">Move-In Completed ✓</Badge>
            ) : null}
          </div>
        )}
      </Card>

      {isActiveStage ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Active Tenancy</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Property</dt>
              <dd className="mt-1 font-semibold">{tenancy.propertyName}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Tenant</dt>
              <dd className="mt-1 font-semibold">{tenancy.tenantName}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Move-In Inspection</dt>
              <dd className="mt-1 font-semibold">
                {moveIn?.status === 'LOCKED' ? 'Completed ✓' : moveIn?.status.replaceAll('_', ' ') || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Move-Out Inspection</dt>
              <dd className="mt-1 font-semibold">
                {!moveOut
                  ? 'Not Started'
                  : moveOut.status === 'COMPLETED'
                    ? 'Completed ✓'
                    : moveOut.status.replaceAll('_', ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Expected Move-Out</dt>
              <dd className="mt-1 font-semibold">{tenancy.moveOut}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Security Deposit</dt>
              <dd className="mt-1 font-semibold">{formatCurrency(tenancy.deposit)}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {moveIn?.status === 'LOCKED' && !moveOut ? (
              <Button disabled={startingMoveOut} onClick={() => void startMoveOut()}>
                {startingMoveOut ? 'Starting...' : 'Start Move-Out Inspection'}
              </Button>
            ) : null}
            {moveOut && ['DRAFT', 'IN_PROGRESS'].includes(moveOut.status) ? (
              <Button onClick={() => navigate(paths.inspectionWizard(moveOut.id))}>
                Continue Move-Out Inspection
              </Button>
            ) : null}
            {moveOut?.status === 'COMPLETED' ? (
              <>
                <Button onClick={() => navigate(paths.comparison(tenancy.id))}>
                  View Comparison
                </Button>
                <Button variant="secondary" onClick={() => navigate(paths.settlement(tenancy.id))}>
                  Settlement & Deductions
                </Button>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="font-bold text-ink">Rental Details</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Period</dt>
            <dd className="mt-1 font-semibold">
              {tenancy.moveIn} → {tenancy.moveOut}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Monthly Rent</dt>
            <dd className="mt-1 font-semibold">{formatCurrency(tenancy.rent)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Security Deposit</dt>
            <dd className="mt-1 font-semibold">{formatCurrency(tenancy.deposit)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="mt-1 font-semibold">{tenancy.tenantPhone || '—'}</dd>
          </div>
        </dl>
      </Card>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Tenant Invitation?"
        description={`${tenancy.tenantName} will no longer be able to activate access using this invitation.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep Invitation
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  setTenancy(await cancelInvitation(tenancy.id))
                  setCancelOpen(false)
                } catch (err) {
                  setError(getErrorMessage(err))
                }
              }}
            >
              Cancel Invitation
            </Button>
          </>
        }
      />
    </div>
  )
}
