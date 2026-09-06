import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Receipt } from 'lucide-react'
import {
  ApprovedChangesSection,
  ConditionReviewSection,
  UnapprovedChangesSection,
} from '@/components/handover/HandoverReviewSections'
import { DeductionCard } from '@/components/settlement/DeductionCard'
import { SettlementSummaryCards } from '@/components/settlement/SettlementSummaryCards'
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
import { formatDisplayDate } from '@/lib/tenancyContext'
import {
  canOwnerAddDeduction,
  getSettlementStatusLabel,
  showFinalRefund,
  splitDeductions,
} from '@/lib/settlementUi'
import { formatCurrency } from '@/lib/utils'
import { reviewChangeCompliance, reviewConditionCompliance } from '@/services/handover.service'
import { getErrorMessage } from '@/services/api'
import { resolveMediaUrl } from '@/services/property.service'
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
  updateDeduction,
} from '@/services/settlement.service'
import type {
  DamageAssessment,
  Deduction,
  Dispute,
  DisputeReason,
  SettlementData,
  TenancyCondition,
} from '@/types'

const DISPUTE_REASONS: Array<{ value: DisputeReason; label: string }> = [
  { value: 'DAMAGE_ALREADY_EXISTED', label: 'Damage already existed' },
  { value: 'NORMAL_WEAR_AND_TEAR', label: 'Normal wear and tear' },
  { value: 'AMOUNT_INCORRECT', label: 'Amount is incorrect' },
  { value: 'INCORRECT_ITEM', label: 'Incorrect item' },
  { value: 'NOT_CAUSED_BY_TENANT', label: 'Damage was not caused by me' },
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

export function SettlementPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [searchParams] = useSearchParams()
  const deductionsRef = useRef<HTMLDivElement>(null)

  const tenancyId =
    searchParams.get('tenancyId') || (user?.role === 'TENANT' ? user.tenantAccess?.tenancyId : '') || ''

  const [data, setData] = useState<SettlementData | null>(null)
  const [assessments, setAssessments] = useState<DamageAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingLabel, setSavingLabel] = useState('')

  const [deductionModalOpen, setDeductionModalOpen] = useState(false)
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(null)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [relatedConditionId, setRelatedConditionId] = useState('')
  const [relatedChangeId, setRelatedChangeId] = useState('')

  const [removeTarget, setRemoveTarget] = useState<Deduction | null>(null)
  const [submitOpen, setSubmitOpen] = useState(false)
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
  const readiness = data?.readiness
  const tenancy = data?.tenancy
  const deductibleAssessments = assessments.filter((a) => a.deductionRequired)

  const settlementComplete = settlement?.status === 'COMPLETED'
  const statusLabel = getSettlementStatusLabel(settlement, {
    openDisputeCount: disputes.filter((d) => d.status === 'OPEN').length,
    ownerDraftCount: deductions.filter((d) => d.status === 'PROPOSED' && !d.submittedForReviewAt)
      .length,
    isOwner,
  })
  const finalRefundMode = showFinalRefund(financials)
  const grouped = splitDeductions(deductions, disputes)
  const openDisputes = disputes.filter((d) => d.status === 'OPEN')
  const tenantActionCount = deductions.filter(
    (d) => d.requiresTenantReview && d.status === 'PROPOSED',
  ).length
  const ownerDraftCount = grouped.drafts.length
  const tenantSubmitted =
    settlement?.status === 'UNDER_REVIEW' ||
    settlement?.status === 'DISPUTED' ||
    settlement?.status === 'READY_FOR_APPROVAL' ||
    settlement?.status === 'READY_FOR_SIGNATURE' ||
    settlementComplete ||
    deductions.some((d) => d.submittedForReviewAt)
  const tenantCanViewDeductions = isOwner || tenantSubmitted
  const canAdd = canOwnerAddDeduction({
    isOwner,
    settlementComplete,
    readinessReady: Boolean(readiness?.ready),
    settlementStatus: settlement?.status,
  })

  const approvedDeductions = useMemo(
    () => deductions.filter((d) => d.status === 'ACCEPTED'),
    [deductions],
  )

  const resetDeductionForm = () => {
    setTitle('')
    setAmount('')
    setDescription('')
    setSelectedAssessmentId('')
    setRelatedConditionId('')
    setRelatedChangeId('')
    setEditingDeduction(null)
  }

  const openAddModal = () => {
    resetDeductionForm()
    setDeductionModalOpen(true)
  }

  const openEditModal = (deduction: Deduction) => {
    setEditingDeduction(deduction)
    setTitle(deduction.title)
    setAmount(String(deduction.amount))
    setDescription(deduction.description || '')
    setSelectedAssessmentId(deduction.damageAssessmentId || '')
    setRelatedConditionId(deduction.tenancyConditionId || '')
    setRelatedChangeId(deduction.propertyChangeRequestId || '')
    setDeductionModalOpen(true)
  }

  const load = async () => {
    if (!tenancyId) return
    setLoading(true)
    setError('')
    try {
      const [settlementData, assessmentList] = await Promise.all([
        getSettlement(tenancyId),
        isOwner ? listDamageAssessments(tenancyId) : Promise.resolve([]),
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
  }, [tenancyId, isOwner])

  const runSave = async (label: string, action: () => Promise<void>) => {
    setSaving(true)
    setSavingLabel(label)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong'))
    } finally {
      setSaving(false)
      setSavingLabel('')
    }
  }

  const handleSaveDeduction = async () => {
    const parsedAmount = Number(amount)
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Enter a valid title and non-negative amount.')
      return
    }
    await runSave(editingDeduction ? 'Updating deduction...' : 'Saving deduction...', async () => {
      if (editingDeduction) {
        await updateDeduction(editingDeduction.id, {
          title: title.trim(),
          description,
          amount: parsedAmount,
        })
      } else {
        await createDeduction(tenancyId, {
          title: title.trim(),
          description,
          amount: parsedAmount,
          damageAssessmentId: selectedAssessmentId || null,
          tenancyConditionId: relatedConditionId || null,
          propertyChangeRequestId: relatedChangeId || null,
        })
      }
      setDeductionModalOpen(false)
      resetDeductionForm()
      await load()
    })
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    await runSave('Removing deduction...', async () => {
      await deleteDeduction(removeTarget.id)
      setRemoveTarget(null)
      await load()
    })
  }

  const handleSubmitForReview = async () => {
    await runSave('Sending for review...', async () => {
      const next = await submitDeductionsForReview(tenancyId)
      setData(next)
      setSubmitOpen(false)
    })
  }

  const handleAccept = async () => {
    if (!acceptTarget) return
    await runSave('Accepting deduction...', async () => {
      const next = await acceptDeduction(acceptTarget.id)
      setData(next)
      setAcceptTarget(null)
    })
  }

  const handleDispute = async () => {
    if (!disputeTarget) return
    if (disputeReason === 'OTHER' && !disputeDescription.trim()) {
      setError('Explanation is required when reason is Other.')
      return
    }
    await runSave('Submitting dispute...', async () => {
      const next = await disputeDeduction(disputeTarget.id, {
        reason: disputeReason,
        description: disputeDescription,
        evidenceDataUrl: disputeEvidence || undefined,
      })
      setData(next)
      setDisputeTarget(null)
      setDisputeDescription('')
      setDisputeEvidence('')
    })
  }

  const handleResolve = async () => {
    if (!resolveTarget) return
    if ((resolveType === 'MODIFY' || resolveType === 'MAINTAIN') && !resolutionNotes.trim()) {
      setError('Resolution notes are required.')
      return
    }
    await runSave('Resolving dispute...', async () => {
      const payload: {
        resolutionType: 'CANCEL' | 'MODIFY' | 'MAINTAIN'
        resolvedAmount?: number
        resolutionNotes?: string
      } = { resolutionType: resolveType, resolutionNotes }
      if (resolveType === 'MODIFY') {
        const parsed = Number(resolvedAmount)
        if (Number.isNaN(parsed) || parsed < 0) {
          setError('Enter a valid resolved amount.')
          throw new Error('invalid amount')
        }
        payload.resolvedAmount = parsed
      }
      const next = await resolveDispute(resolveTarget.id, payload)
      setData(next)
      setResolveTarget(null)
      setResolutionNotes('')
      setResolvedAmount('')
    })
  }

  const handleApprove = async () => {
    await runSave('Approving settlement...', async () => {
      const next = await approveSettlement(tenancyId)
      setData(next)
      setApproveOpen(false)
      if (next.settlement?.status === 'READY_FOR_SIGNATURE') {
        navigate(paths.settlementSign(tenancyId))
      }
    })
  }

  if (!tenancyId) {
    return (
      <div>
        <PageHeader title="Settlement" description="Review deductions and refund." />
        <EmptyState
          icon={Receipt}
          title="No tenancy selected"
          description={
            isOwner
              ? 'Open a tenancy to manage settlement and deductions.'
              : 'Your settlement will appear here once your rental is active.'
          }
        />
      </div>
    )
  }

  if (loading) return <p className="text-sm text-ink-secondary">Loading settlement...</p>

  const reportUrl = data?.report?.fileUrl ? resolveMediaUrl(data.report.fileUrl) : ''

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settlement"
        description={
          isOwner
            ? `${tenancy?.propertyName || '—'} · ${tenancy?.tenantName || '—'}`
            : `${tenancy?.propertyName || '—'} · Owner: ${tenancy?.ownerName || user?.tenantAccess?.ownerName || '—'}`
        }
        actions={
          <>
            <Badge status={settlementComplete ? 'Active' : 'Proposed'}>{statusLabel}</Badge>
            {canAdd ? (
              <Button onClick={openAddModal}>
                <Plus className="h-4 w-4" />
                Add Deduction
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-ink-muted">Property</p>
          <p className="font-semibold text-ink">{tenancy?.propertyName || '—'}</p>
        </div>
        <div>
          <p className="text-ink-muted">{isOwner ? 'Tenant' : 'Owner'}</p>
          <p className="font-semibold text-ink">
            {isOwner ? tenancy?.tenantName : tenancy?.ownerName || user?.tenantAccess?.ownerName}
          </p>
        </div>
        <div>
          <p className="text-ink-muted">Move-Out Date</p>
          <p className="font-semibold text-ink">
            {formatDisplayDate(tenancy?.actualMoveOut || tenancy?.moveOut)}
          </p>
        </div>
        <div>
          <p className="text-ink-muted">Settlement Status</p>
          <p className="font-semibold text-ink">{statusLabel}</p>
        </div>
      </Card>

      {readiness && !readiness.ready && isOwner ? (
        <Card className="border-warning bg-warning-bg/30">
          <p className="font-semibold text-ink">Settlement not ready</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-secondary">
            {readiness.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {financials && (isOwner || tenantSubmitted) ? (
        <SettlementSummaryCards
          financials={financials}
          showFinal={finalRefundMode}
          isOwner={isOwner}
        />
      ) : null}

      {data?.conditions?.length ||
      data?.handover?.approvedChanges?.length ||
      data?.changeRequests?.length ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-ink">Handover Conditions & Approved Changes</h2>
          <ConditionReviewSection
            conditions={data.conditions || []}
            acceptedAt={data.handover?.conditionsAcceptedAt}
            isOwner={isOwner && !settlementComplete}
            deductions={deductions}
            onReview={async (condition: TenancyCondition, payload) => {
              try {
                await reviewConditionCompliance(condition.id, payload)
                await load()
              } catch (err) {
                setError(getErrorMessage(err, 'Unable to update condition review'))
              }
            }}
          />
          <ApprovedChangesSection
            isOwner={isOwner && !settlementComplete}
            deductions={deductions}
            requests={
              data.handover?.approvedChanges ||
              (data.changeRequests || []).filter((r) =>
                ['APPROVED', 'COMPLETED'].includes(r.status),
              )
            }
            onReview={async (request, payload) => {
              try {
                await reviewChangeCompliance(request.id, payload)
                await load()
              } catch (err) {
                setError(getErrorMessage(err, 'Unable to update change compliance'))
              }
            }}
          />
          <UnapprovedChangesSection
            requests={
              data.handover?.rejectedChanges ||
              (data.changeRequests || []).filter((r) => r.status === 'REJECTED')
            }
          />
        </div>
      ) : null}

      {financials?.depositExhausted ? (
        <Card className="border-warning bg-warning-bg/20 text-sm text-warning">
          Security deposit exhausted.
          {financials.additionalAmountClaimed
            ? ` Additional amount claimed: ${formatCurrency(financials.additionalAmountClaimed)}`
            : null}
        </Card>
      ) : null}

      {settlementComplete ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Settlement Completed</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Final refund:{' '}
            <span className="font-bold text-brand-700">
              {formatCurrency(financials?.finalRefund ?? 0)}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => navigate(paths.settlementComplete(tenancyId))}>
              View Completion Summary
            </Button>
            {reportUrl ? (
              <a
                href={reportUrl}
                download
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border-strong bg-white px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
              >
                Download Final Report
              </a>
            ) : null}
          </div>
        </Card>
      ) : null}

      {!isOwner && !tenantSubmitted ? (
        <EmptyState
          icon={Receipt}
          title="Settlement Not Ready Yet"
          description="The Owner has not submitted the settlement for review."
        />
      ) : null}

      {tenantCanViewDeductions ? (
        <>
      {isOwner && settlement?.status === 'UNDER_REVIEW' && ownerDraftCount === 0 ? (
        <Card className="border-brand-200 bg-brand-50/40">
          <h2 className="font-semibold text-ink">Waiting for Tenant Review</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            {tenancy?.tenantName} is reviewing the proposed deductions.
          </p>
        </Card>
      ) : null}

      {!isOwner && tenantActionCount > 0 ? (
        <Card className="border-warning bg-warning-bg/30">
          <h2 className="font-semibold text-ink">Action Required</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            You have {tenantActionCount} deduction{tenantActionCount === 1 ? '' : 's'} to review.
          </p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => deductionsRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            Review Deductions
          </Button>
        </Card>
      ) : null}

      {isOwner && openDisputes.length > 0 ? (
        <Card className="border-danger/30 bg-danger-bg/10">
          <h2 className="font-semibold text-ink">Disputes Requiring Attention</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            {openDisputes.length} dispute{openDisputes.length === 1 ? '' : 's'} need review.
          </p>
        </Card>
      ) : null}

      {isOwner && ownerDraftCount > 0 && canAdd ? (
        <div className="flex flex-wrap gap-2">
          <Button disabled={saving} onClick={() => setSubmitOpen(true)}>
            Send for Tenant Review
          </Button>
        </div>
      ) : null}

      <div ref={deductionsRef}>
      <Card>
        <h2 className="text-lg font-bold text-ink">Deductions</h2>
        {deductions.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Receipt}
              title="No Deductions Added"
              description="No financial deductions have been added to this settlement."
              actionLabel={canAdd ? '+ Add Deduction' : undefined}
              onAction={canAdd ? openAddModal : undefined}
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {deductions
              .filter((d) => d.status !== 'CANCELLED')
              .map((deduction) => (
                <DeductionCard
                  key={deduction.id}
                  deduction={deduction}
                  disputes={disputes}
                  isOwner={isOwner}
                  relatedConditionTitle={
                    data?.conditions?.find((c) => c.id === deduction.tenancyConditionId)?.title
                  }
                  relatedChangeTitle={
                    (data?.changeRequests || data?.handover?.approvedChanges || []).find(
                      (r) => r.id === deduction.propertyChangeRequestId,
                    )?.title
                  }
                  onEdit={
                    isOwner && deduction.status === 'PROPOSED' && !deduction.submittedForReviewAt
                      ? () => openEditModal(deduction)
                      : undefined
                  }
                  onRemove={
                    isOwner && deduction.status === 'PROPOSED' && !deduction.submittedForReviewAt
                      ? () => setRemoveTarget(deduction)
                      : undefined
                  }
                  onAccept={
                    !isOwner && deduction.requiresTenantReview && deduction.status === 'PROPOSED'
                      ? () => setAcceptTarget(deduction)
                      : undefined
                  }
                  onDispute={
                    !isOwner &&
                    deduction.requiresTenantReview &&
                    deduction.status === 'PROPOSED' &&
                    !deduction.isRevisedDeduction
                      ? () => setDisputeTarget(deduction)
                      : undefined
                  }
                  onReviewDispute={
                    isOwner
                      ? () => {
                          const d = disputes.find(
                            (x) => x.deductionId === deduction.id && x.status === 'OPEN',
                          )
                          if (d) setResolveTarget(d)
                        }
                      : undefined
                  }
                />
              ))}
          </ul>
        )}
      </Card>
      </div>

      {grouped.accepted.length > 0 ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Resolved Items</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {grouped.accepted.map((d) => (
              <li key={d.id} className="flex justify-between gap-3">
                <span>
                  {d.title}
                  {d.originalAmount != null && d.originalAmount !== d.amount ? (
                    <span className="text-ink-muted">
                      {' '}
                      ({formatCurrency(d.originalAmount)} → {formatCurrency(d.amount)})
                    </span>
                  ) : null}
                </span>
                <span className="font-semibold">{formatCurrency(d.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {settlement?.status === 'READY_FOR_APPROVAL' ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Final Settlement</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Security Deposit</dt>
              <dd className="font-semibold">{formatCurrency(financials?.securityDeposit ?? 0)}</dd>
            </div>
            {approvedDeductions.map((d) => (
              <div key={d.id} className="flex justify-between">
                <dt className="text-ink-muted">{d.title}</dt>
                <dd className="font-semibold">{formatCurrency(d.amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="font-semibold">Total Deduction</dt>
              <dd className="font-bold">{formatCurrency(financials?.finalDeductionTotal ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-semibold text-brand-700">Final Refund</dt>
              <dd className="text-xl font-bold text-brand-700">
                {formatCurrency(financials?.finalRefund ?? 0)}
              </dd>
            </div>
          </dl>
          <div className="mt-4 space-y-2 text-sm">
            <p>
              Owner: {settlement.ownerApproved ? '✓ Approved' : 'Pending'}
            </p>
            <p>
              Tenant: {settlement.tenantApproved ? '✓ Approved' : 'Pending'}
            </p>
          </div>
          {((isOwner && !settlement.ownerApproved) || (!isOwner && !settlement.tenantApproved)) ? (
            <Button className="mt-4" disabled={saving} onClick={() => setApproveOpen(true)}>
              Approve Settlement
            </Button>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Waiting for the other party to approve.</p>
          )}
        </Card>
      ) : null}

      {settlement?.status === 'READY_FOR_SIGNATURE' && !settlementComplete ? (
        <Card>
          <h2 className="font-bold text-ink">Final Sign-Off</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Final refund:{' '}
            <span className="font-bold text-brand-700">
              {formatCurrency(financials?.finalRefund ?? financials?.projectedRefund ?? 0)}
            </span>
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            Owner: {settlement.ownerSigned ? '✓ Signed' : 'Pending'} · Tenant:{' '}
            {settlement.tenantSigned ? '✓ Signed' : 'Pending'}
          </p>
          {((isOwner && !settlement.ownerSigned) || (!isOwner && !settlement.tenantSigned)) ? (
            <Button className="mt-4" onClick={() => navigate(paths.settlementSign(tenancyId))}>
              Sign Settlement
            </Button>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Waiting for the other party to sign.</p>
          )}
        </Card>
      ) : null}
        </>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {saving && savingLabel ? (
        <p className="text-sm text-ink-secondary">{savingLabel}</p>
      ) : null}

      <Modal
        open={deductionModalOpen}
        onClose={() => {
          setDeductionModalOpen(false)
          resetDeductionForm()
        }}
        title={editingDeduction ? 'Edit Deduction' : 'Add Deduction'}
        className="max-w-lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDeductionModalOpen(false)
                resetDeductionForm()
              }}
            >
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void handleSaveDeduction()}>
              {saving
                ? editingDeduction
                  ? 'Updating...'
                  : 'Saving...'
                : editingDeduction
                  ? 'Update Deduction'
                  : 'Save Deduction'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deductibleAssessments.length > 0 ? (
            <div>
              <label className="text-sm font-semibold text-ink">Item</label>
              <select
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                value={selectedAssessmentId}
                onChange={(e) => {
                  const id = e.target.value
                  setSelectedAssessmentId(id)
                  const assessment = deductibleAssessments.find((a) => a.id === id)
                  if (assessment) {
                    setTitle(assessment.itemName)
                    setDescription(assessment.description || '')
                  }
                }}
              >
                <option value="">Select from damage assessment</option>
                {deductibleAssessments.map((assessment) => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.itemName} — {assessment.classification.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <Input label="Deduction Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label="Amount (₹)"
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Textarea
            label="Reason / Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {(data?.conditions || []).length ? (
            <div>
              <label className="text-sm font-semibold text-ink">Related handover condition</label>
              <select
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                value={relatedConditionId}
                onChange={(e) => setRelatedConditionId(e.target.value)}
              >
                <option value="">None</option>
                {(data?.conditions || []).map((condition) => (
                  <option key={condition.id} value={condition.id}>
                    {condition.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {(data?.handover?.approvedChanges || data?.changeRequests || []).length ? (
            <div>
              <label className="text-sm font-semibold text-ink">Related approved change</label>
              <select
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                value={relatedChangeId}
                onChange={(e) => setRelatedChangeId(e.target.value)}
              >
                <option value="">None</option>
                {(
                  data?.handover?.approvedChanges ||
                  (data?.changeRequests || []).filter((r) =>
                    ['APPROVED', 'COMPLETED'].includes(r.status),
                  )
                ).map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.title}
                    {request.roomName ? ` — ${request.roomName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Deduction?"
        description={
          removeTarget
            ? `${removeTarget.title} — ${formatCurrency(removeTarget.amount)}. This deduction will no longer be included in the settlement.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={() => void handleRemove()}>
              Remove Deduction
            </Button>
          </>
        }
      />

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Send Settlement for Review?"
        description="The Tenant will be able to review, accept, or dispute the proposed deductions."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void handleSubmitForReview()}>
              Send for Review
            </Button>
          </>
        }
      />

      <Modal
        open={!!acceptTarget}
        onClose={() => setAcceptTarget(null)}
        title={
          acceptTarget?.isRevisedDeduction
            ? 'Accept Revised Deduction?'
            : acceptTarget
              ? `Accept ${formatCurrency(acceptTarget.amount)} Deduction?`
              : 'Accept Deduction?'
        }
        description="This amount will be included in your settlement."
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
            label="Explain why you disagree with this deduction"
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
        title="Review Dispute"
        className="max-w-lg"
        footer={
          resolveType === 'CANCEL' ? (
            <>
              <Button variant="secondary" onClick={() => setResolveTarget(null)}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void handleResolve()}>
                Accept Dispute
              </Button>
            </>
          ) : resolveType === 'MODIFY' ? (
            <>
              <Button variant="secondary" onClick={() => setResolveTarget(null)}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void handleResolve()}>
                Save Resolution
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setResolveTarget(null)}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void handleResolve()}>
                Confirm Resolution
              </Button>
            </>
          )
        }
      >
        {resolveTarget ? (
          <div className="space-y-3 text-sm">
            <p>
              Tenant reason:{' '}
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
                <option value="CANCEL">Accept Tenant Dispute</option>
                <option value="MODIFY">Modify Deduction</option>
                <option value="MAINTAIN">Maintain Deduction</option>
              </select>
            </div>
            {resolveType === 'MODIFY' ? (
              <>
                <p className="text-ink-muted">
                  Original: {formatCurrency(resolveTarget.originalAmount ?? 0)}
                </p>
                <Input
                  label="New Amount (₹)"
                  type="number"
                  min="0"
                  value={resolvedAmount}
                  onChange={(e) => setResolvedAmount(e.target.value)}
                />
              </>
            ) : null}
            <Textarea
              label="Resolution note"
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
        description="You confirm that the deductions and final refund shown above are correct."
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
