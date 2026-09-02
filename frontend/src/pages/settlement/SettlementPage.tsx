import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/context/AuthContext'
import { useAppPaths } from '@/hooks/useAppPaths'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/services/api'
import {
  acceptDeduction,
  approveSettlement,
  createDeduction,
  deleteDeduction,
  disputeDeduction,
  getSettlement,
  listDamageAssessments,
  resolveDispute,
  submitDeductionsForReview,
} from '@/services/settlement.service'
import type {
  DamageAssessment,
  Deduction,
  Dispute,
  DisputeReason,
  SettlementData,
} from '@/types'

const DISPUTE_REASONS: Array<{ value: DisputeReason; label: string }> = [
  { value: 'DAMAGE_ALREADY_EXISTED', label: 'Damage already existed' },
  { value: 'NORMAL_WEAR_AND_TEAR', label: 'Normal wear and tear' },
  { value: 'AMOUNT_INCORRECT', label: 'Amount is incorrect' },
  { value: 'INCORRECT_ITEM', label: 'Incorrect item' },
  { value: 'NOT_CAUSED_BY_TENANT', label: 'Not caused by tenant' },
  { value: 'INSUFFICIENT_EVIDENCE', label: 'Insufficient evidence' },
  { value: 'OTHER', label: 'Other' },
]

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function disputeForDeduction(disputes: Dispute[], deductionId: string) {
  return disputes.find((d) => d.deductionId === deductionId && d.status === 'OPEN')
}

export function SettlementPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [searchParams] = useSearchParams()
  const tenancyId = searchParams.get('tenancyId') || ''

  const [data, setData] = useState<SettlementData | null>(null)
  const [assessments, setAssessments] = useState<DamageAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')

  const [acceptTarget, setAcceptTarget] = useState<Deduction | null>(null)
  const [disputeTarget, setDisputeTarget] = useState<Deduction | null>(null)
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('DAMAGE_ALREADY_EXISTED')
  const [disputeDescription, setDisputeDescription] = useState('')
  const [disputeEvidence, setDisputeEvidence] = useState('')

  const [resolveTarget, setResolveTarget] = useState<Dispute | null>(null)
  const [resolveType, setResolveType] = useState<'CANCEL' | 'MODIFY' | 'MAINTAIN'>('MAINTAIN')
  const [resolvedAmount, setResolvedAmount] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')

  const [approveOpen, setApproveOpen] = useState(false)

  const isOwner = user?.role === 'OWNER'
  const deductions = data?.deductions ?? []
  const disputes = data?.disputes ?? []
  const financials = data?.financials
  const settlement = data?.settlement
  const deductibleAssessments = assessments.filter((a) => a.deductionRequired)

  const proposedCount = deductions.filter((d) => d.status === 'PROPOSED').length
  const openDisputes = disputes.filter((d) => d.status === 'OPEN')

  const showFinalRefund = useMemo(
    () =>
      financials?.finalRefund != null &&
      financials.allResolved &&
      !financials.hasOpenDisputes &&
      !financials.hasPendingProposed,
    [financials],
  )

  const load = async () => {
    if (!tenancyId) return
    setLoading(true)
    setError('')
    try {
      const [settlementData, assessmentList] = await Promise.all([
        getSettlement(tenancyId),
        listDamageAssessments(tenancyId),
      ])
      setData(settlementData)
      setAssessments(assessmentList)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load settlement'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [tenancyId])

  const handleAdd = async () => {
    if (!tenancyId) return
    const parsedAmount = Number(amount)
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Enter a valid title and non-negative amount.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const next = await createDeduction(tenancyId, {
        title: title.trim(),
        description,
        amount: parsedAmount,
        damageAssessmentId: selectedAssessmentId || null,
      })
      setData(next)
      setTitle('')
      setAmount('')
      setDescription('')
      setSelectedAssessmentId('')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to add deduction'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDeduction(id)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to remove deduction'))
    }
  }

  const handleSubmitForReview = async () => {
    if (!tenancyId) return
    setSaving(true)
    setError('')
    try {
      const next = await submitDeductionsForReview(tenancyId)
      setData(next)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to submit deductions'))
    } finally {
      setSaving(false)
    }
  }

  const handleAccept = async () => {
    if (!acceptTarget) return
    setSaving(true)
    setError('')
    try {
      const next = await acceptDeduction(acceptTarget.id)
      setData(next)
      setAcceptTarget(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to accept deduction'))
    } finally {
      setSaving(false)
    }
  }

  const handleDispute = async () => {
    if (!disputeTarget) return
    if (disputeReason === 'OTHER' && !disputeDescription.trim()) {
      setError('Explanation is required when reason is Other.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const next = await disputeDeduction(disputeTarget.id, {
        reason: disputeReason,
        description: disputeDescription,
        evidenceDataUrl: disputeEvidence || undefined,
      })
      setData(next)
      setDisputeTarget(null)
      setDisputeDescription('')
      setDisputeEvidence('')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to submit dispute'))
    } finally {
      setSaving(false)
    }
  }

  const handleResolve = async () => {
    if (!resolveTarget) return
    setSaving(true)
    setError('')
    try {
      const payload: {
        resolutionType: 'CANCEL' | 'MODIFY' | 'MAINTAIN'
        resolvedAmount?: number
        resolutionNotes?: string
      } = {
        resolutionType: resolveType,
        resolutionNotes,
      }
      if (resolveType === 'MODIFY') {
        const parsed = Number(resolvedAmount)
        if (Number.isNaN(parsed) || parsed < 0) {
          setError('Enter a valid resolved amount.')
          setSaving(false)
          return
        }
        payload.resolvedAmount = parsed
      }
      const next = await resolveDispute(resolveTarget.id, payload)
      setData(next)
      setResolveTarget(null)
      setResolutionNotes('')
      setResolvedAmount('')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to resolve dispute'))
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!tenancyId) return
    setSaving(true)
    setError('')
    try {
      const next = await approveSettlement(tenancyId)
      setData(next)
      setApproveOpen(false)
      if (next.settlement?.status === 'READY_FOR_SIGNATURE') {
        navigate(paths.settlementSign(tenancyId))
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to approve settlement'))
    } finally {
      setSaving(false)
    }
  }

  if (!tenancyId) {
    return (
      <div>
        <PageHeader title="Security Deposit Settlement" description="Review deductions and refund." />
        <EmptyState
          icon={Receipt}
          title="No tenancy selected"
          description="Open a tenancy to manage settlement and deductions."
        />
      </div>
    )
  }

  if (loading) return <p className="text-sm text-ink-secondary">Loading settlement...</p>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Deposit Settlement"
        description={
          data?.tenancy
            ? `${data.tenancy.propertyName} · ${data.tenancy.tenantName}`
            : 'Review proposed deductions and projected refund.'
        }
      />

      {financials ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">Financial Summary</h2>
            {settlement?.status ? (
              <Badge status="Proposed">{settlement.status.replaceAll('_', ' ')}</Badge>
            ) : null}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Security Deposit</dt>
              <dd className="font-semibold">{formatCurrency(financials.securityDeposit)}</dd>
            </div>
            {financials.acceptedDeductionTotal > 0 ? (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Accepted Deductions</dt>
                <dd className="font-semibold text-danger">
                  − {formatCurrency(financials.acceptedDeductionTotal)}
                </dd>
              </div>
            ) : null}
            {financials.disputedDeductionTotal > 0 ? (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Disputed (pending)</dt>
                <dd className="font-semibold text-warning">
                  {formatCurrency(financials.disputedDeductionTotal)}
                </dd>
              </div>
            ) : null}
            {financials.proposedDeductionTotal > 0 ? (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Awaiting Review</dt>
                <dd className="font-semibold">{formatCurrency(financials.proposedDeductionTotal)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-semibold text-ink">
                {showFinalRefund ? 'Final Refund' : 'Projected Refund'}
              </dt>
              <dd className="font-bold text-brand-700">
                {formatCurrency(
                  showFinalRefund ? (financials.finalRefund ?? 0) : financials.projectedRefund,
                )}
              </dd>
            </div>
          </dl>
          {financials.exceedsDeposit ? (
            <div className="mt-4 rounded-xl bg-warning-bg px-3 py-2 text-sm text-warning">
              Accepted deductions exceed the security deposit.
            </div>
          ) : null}
        </Card>
      ) : null}

      {isOwner && proposedCount > 0 && settlement?.status !== 'COMPLETED' ? (
        <Card className="border-brand-200 bg-brand-50/40">
          <p className="text-sm text-ink-secondary">
            {proposedCount} deduction{proposedCount === 1 ? '' : 's'} ready to send for tenant
            review.
          </p>
          <Button className="mt-3" disabled={saving} onClick={() => void handleSubmitForReview()}>
            Submit for Tenant Review
          </Button>
        </Card>
      ) : null}

      {!isOwner && proposedCount > 0 ? (
        <Card className="border-warning bg-warning-bg/30">
          <p className="font-semibold text-ink">Review Deductions</p>
          <p className="mt-1 text-sm text-ink-secondary">
            {proposedCount} proposed deduction{proposedCount === 1 ? '' : 's'} require your
            response.
          </p>
        </Card>
      ) : null}

      {isOwner && openDisputes.length > 0 ? (
        <Card className="border-danger/30 bg-danger-bg/20">
          <p className="font-semibold text-ink">
            {openDisputes.length} dispute{openDisputes.length === 1 ? '' : 's'} require review
          </p>
        </Card>
      ) : null}

      {isOwner ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Add Proposed Deduction</h2>
          <div className="mt-4 space-y-3">
            {deductibleAssessments.length > 0 ? (
              <div>
                <label className="text-sm font-semibold text-ink">Linked Assessment (optional)</label>
                <select
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  value={selectedAssessmentId}
                  onChange={(e) => {
                    const id = e.target.value
                    setSelectedAssessmentId(id)
                    const assessment = deductibleAssessments.find((a) => a.id === id)
                    if (assessment) setTitle(assessment.itemName)
                  }}
                >
                  <option value="">None</option>
                  {deductibleAssessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.itemName} — {assessment.classification.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Input label="Reason" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input
              label="Amount (₹)"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button disabled={saving} onClick={() => void handleAdd()}>
              {saving ? 'Adding...' : 'Add Deduction'}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-bold text-ink">Deductions</h2>
        {deductions.length === 0 ? (
          <p className="mt-3 text-sm text-ink-secondary">No deductions proposed.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {deductions.map((deduction) => {
              const dispute = disputeForDeduction(disputes, deduction.id)
              return (
                <li
                  key={deduction.id}
                  className="rounded-xl border border-border px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{deduction.title}</p>
                      {deduction.description ? (
                        <p className="mt-1 text-sm text-ink-secondary">{deduction.description}</p>
                      ) : null}
                      {deduction.originalAmount != null &&
                      deduction.resolvedAmount != null &&
                      deduction.originalAmount !== deduction.resolvedAmount ? (
                        <p className="mt-1 text-xs text-ink-muted">
                          Original: {formatCurrency(deduction.originalAmount)} → Resolved:{' '}
                          {formatCurrency(deduction.resolvedAmount)}
                        </p>
                      ) : null}
                      <Badge className="mt-2" status="Proposed">
                        {deduction.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-ink">{formatCurrency(deduction.amount)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {isOwner && deduction.status === 'PROPOSED' ? (
                      <Button
                        variant="tertiary"
                        size="sm"
                        onClick={() => void handleDelete(deduction.id)}
                      >
                        Remove
                      </Button>
                    ) : null}
                    {!isOwner && deduction.status === 'PROPOSED' ? (
                      <>
                        <Button size="sm" onClick={() => setAcceptTarget(deduction)}>
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDisputeTarget(deduction)}
                        >
                          Dispute
                        </Button>
                      </>
                    ) : null}
                    {isOwner && dispute ? (
                      <Button size="sm" onClick={() => setResolveTarget(dispute)}>
                        Review Dispute
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {settlement?.status === 'READY_FOR_APPROVAL' ? (
        <Card>
          <h2 className="font-bold text-ink">Final Settlement</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            All deductions are resolved. Review the final refund and approve when ready.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Owner Approval</dt>
              <dd className="font-semibold">{settlement.ownerApproved ? '✓ Approved' : 'Pending'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Tenant Approval</dt>
              <dd className="font-semibold">
                {settlement.tenantApproved ? '✓ Approved' : 'Pending'}
              </dd>
            </div>
          </dl>
          {((isOwner && !settlement.ownerApproved) || (!isOwner && !settlement.tenantApproved)) ? (
            <Button className="mt-4" onClick={() => setApproveOpen(true)}>
              Approve Settlement
            </Button>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Waiting for the other party to approve.</p>
          )}
        </Card>
      ) : null}

      {settlement?.status === 'READY_FOR_SIGNATURE' || settlement?.status === 'COMPLETED' ? (
        <Card>
          <h2 className="font-bold text-ink">
            {settlement.status === 'COMPLETED' ? 'Handover Completed' : 'Signature Required'}
          </h2>
          <p className="mt-2 text-sm text-ink-secondary">
            {settlement.status === 'COMPLETED'
              ? 'Both parties have signed. The final report is available.'
              : 'Both parties must sign to complete the handover.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {settlement.status === 'READY_FOR_SIGNATURE' ? (
              <Button onClick={() => navigate(paths.settlementSign(tenancyId))}>
                Review & Sign
              </Button>
            ) : null}
            {settlement.status === 'COMPLETED' ? (
              <Button onClick={() => navigate(paths.settlementComplete(tenancyId))}>
                View Completion Summary
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Modal
        open={!!acceptTarget}
        onClose={() => setAcceptTarget(null)}
        title={`Accept ${acceptTarget ? formatCurrency(acceptTarget.amount) : ''} Deduction?`}
        description="Once accepted, this amount will be included in the settlement unless later modified through dispute resolution."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAcceptTarget(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void handleAccept()}>
              Accept Deduction
            </Button>
          </>
        }
      />

      <Modal
        open={!!disputeTarget}
        onClose={() => setDisputeTarget(null)}
        title="Dispute Deduction"
        description={
          disputeTarget
            ? `${disputeTarget.title} — ${formatCurrency(disputeTarget.amount)}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDisputeTarget(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void handleDispute()}>
              Submit Dispute
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-ink">Reason</label>
            <select
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value as DisputeReason)}
            >
              {DISPUTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            label="Explanation"
            value={disputeDescription}
            onChange={(e) => setDisputeDescription(e.target.value)}
          />
          <div>
            <label className="text-sm font-semibold text-ink">Optional Evidence</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) setDisputeEvidence(await fileToDataUrl(file))
              }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!resolveTarget}
        onClose={() => setResolveTarget(null)}
        title="Resolve Dispute"
        className="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResolveTarget(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void handleResolve()}>
              Submit Resolution
            </Button>
          </>
        }
      >
        {resolveTarget ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-ink-muted">Tenant reason: </span>
              {DISPUTE_REASONS.find((r) => r.value === resolveTarget.reason)?.label ||
                resolveTarget.reason}
            </p>
            {resolveTarget.description ? (
              <p className="text-ink-secondary">{resolveTarget.description}</p>
            ) : null}
            <div>
              <label className="font-semibold text-ink">Resolution</label>
              <select
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                value={resolveType}
                onChange={(e) =>
                  setResolveType(e.target.value as 'CANCEL' | 'MODIFY' | 'MAINTAIN')
                }
              >
                <option value="CANCEL">Accept tenant dispute (cancel deduction)</option>
                <option value="MODIFY">Modify deduction amount</option>
                <option value="MAINTAIN">Maintain original deduction</option>
              </select>
            </div>
            {resolveType === 'MODIFY' ? (
              <Input
                label="Resolved Amount (₹)"
                type="number"
                min="0"
                value={resolvedAmount}
                onChange={(e) => setResolvedAmount(e.target.value)}
              />
            ) : null}
            <Textarea
              label="Resolution notes"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve Final Settlement?"
        description="You confirm that the deduction amounts and final refund shown above are correct."
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void handleApprove()}>
              Approve Settlement
            </Button>
          </>
        }
      />
    </div>
  )
}
