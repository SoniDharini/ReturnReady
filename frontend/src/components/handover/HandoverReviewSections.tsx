import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { COMPLIANCE_OPTIONS, changeStatusLabel } from '@/lib/handoverUi'
import { formatDisplayDate } from '@/lib/tenancyContext'
import { resolveMediaUrl } from '@/services/property.service'
import type { ComplianceStatus, Deduction, PropertyChangeRequest, TenancyCondition } from '@/types'

function relatedDeduction(deductions: Deduction[] | undefined, conditionId?: string, requestId?: string) {
  return (deductions || []).find(
    (item) =>
      (conditionId && item.tenancyConditionId === conditionId) ||
      (requestId && item.propertyChangeRequestId === requestId),
  )
}

export function ApprovedChangesSection({
  requests,
  title = 'Approved Property Changes',
  isOwner = false,
  deductions,
  onReview,
}: {
  requests: PropertyChangeRequest[]
  title?: string
  isOwner?: boolean
  deductions?: Deduction[]
  onReview?: (
    request: PropertyChangeRequest,
    payload: { complianceStatus: ComplianceStatus; complianceNotes?: string; evidenceDataUrl?: string },
  ) => void
}) {
  if (!requests.length) return null
  return (
    <Card>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Approved changes do not rewrite the locked Move-In baseline. Non-compliance does not
        automatically create a deduction.
      </p>
      <ul className="mt-4 space-y-3">
        {requests.map((request) => {
          const linked = relatedDeduction(deductions, undefined, request.id)
          return (
            <li key={request.id} className="rounded-xl bg-surface-muted px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">
                  {request.roomName ? `${request.roomName} — ${request.title}` : request.title}
                </p>
                <Badge tone={request.status === 'COMPLETED' ? 'success' : 'warning'}>
                  {changeStatusLabel(request.status)}
                </Badge>
              </div>
              {request.reviewedAt ? (
                <p className="mt-1 text-ink-muted">Approved: {formatDisplayDate(request.reviewedAt)}</p>
              ) : null}
            {request.ownerConditions ? (
              <p className="mt-2 text-ink-secondary">
                Owner condition: {request.ownerConditions}
              </p>
            ) : null}
            {request.ownerConditions ? (
              <p className="mt-1 text-ink-muted">
                Tenant accepted conditions:{' '}
                {request.tenantConditionsAccepted
                  ? `Yes${request.tenantConditionsAcceptedAt ? ` · ${formatDisplayDate(request.tenantConditionsAcceptedAt)}` : ''}`
                  : 'No'}
              </p>
            ) : null}
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Move-Out: {COMPLIANCE_OPTIONS.find((o) => o.value === request.complianceStatus)?.label ||
                  request.complianceStatus ||
                  'Needs review'}
              </p>
              {request.complianceNotes ? (
                <p className="mt-1 text-ink-secondary">Notes: {request.complianceNotes}</p>
              ) : null}
              {linked ? (
                <p className="mt-1 text-ink-secondary">
                  Related deduction: {linked.title} (owner-proposed, not automatic)
                </p>
              ) : null}
              {isOwner && onReview ? (
                <ChangeComplianceControls request={request} onReview={onReview} />
              ) : null}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function ChangeComplianceControls({
  request,
  onReview,
}: {
  request: PropertyChangeRequest
  onReview: (
    request: PropertyChangeRequest,
    payload: { complianceStatus: ComplianceStatus; complianceNotes?: string; evidenceDataUrl?: string },
  ) => void
}) {
  return (
    <div className="mt-3 space-y-2">
      <Select
        label="Move-Out compliance"
        value={request.complianceStatus || 'NEEDS_REVIEW'}
        options={COMPLIANCE_OPTIONS}
        onChange={(e) =>
          onReview(request, { complianceStatus: e.target.value as ComplianceStatus })
        }
      />
      <Textarea
        label="Compliance notes"
        defaultValue={request.complianceNotes || ''}
        onBlur={(e) => {
          if (e.target.value !== (request.complianceNotes || '')) {
            onReview(request, {
              complianceStatus: request.complianceStatus || 'NEEDS_REVIEW',
              complianceNotes: e.target.value,
            })
          }
        }}
      />
      <input
        type="file"
        accept="image/*"
        className="block w-full text-sm"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const dataUrl = await fileToDataUrl(file)
          onReview(request, {
            complianceStatus: request.complianceStatus || 'NEEDS_REVIEW',
            evidenceDataUrl: dataUrl,
          })
        }}
      />
    </div>
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function UnapprovedChangesSection({ requests }: { requests: PropertyChangeRequest[] }) {
  if (!requests.length) return null
  return (
    <Card className="border-warning bg-warning-bg/20">
      <h2 className="text-lg font-bold text-ink">Unapproved Change Requests</h2>
      <p className="mt-1 text-sm text-ink-secondary">
        These requests were rejected. If the change still appears at Move-Out, assess it through
        the existing damage and deduction workflow. No automatic charge is created.
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {requests.map((request) => (
          <li key={request.id}>
            <span className="font-semibold text-ink">{request.title}</span>
            {request.roomName ? <span className="text-ink-muted"> — {request.roomName}</span> : null}
            {request.ownerNotes ? (
              <p className="text-ink-secondary">Owner reason: {request.ownerNotes}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function ConditionReviewSection({
  conditions,
  acceptedAt,
  isOwner,
  deductions,
  onReview,
}: {
  conditions: TenancyCondition[]
  acceptedAt?: string | null
  isOwner: boolean
  deductions?: Deduction[]
  onReview?: (
    condition: TenancyCondition,
    payload: { complianceStatus: ComplianceStatus; complianceNotes?: string; evidenceDataUrl?: string },
  ) => void
}) {
  if (!conditions.length) return null
  return (
    <Card>
      <h2 className="text-lg font-bold text-ink">Handover Conditions</h2>
      {acceptedAt ? (
        <p className="mt-1 text-sm text-ink-secondary">
          Tenant accepted on {formatDisplayDate(acceptedAt)}.
        </p>
      ) : null}
      <p className="mt-2 text-sm text-ink-muted">
        A condition marked as not complied does not automatically create a deduction.
      </p>
      <ul className="mt-4 space-y-3">
        {conditions.map((condition) => {
          const linked = relatedDeduction(deductions, condition.id)
          const evidence = condition.complianceEvidence?.[0]?.fileUrl
          return (
            <li key={condition.id} className="rounded-xl border border-border px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{condition.title}</p>
                  {condition.description ? (
                    <p className="mt-1 text-sm text-ink-secondary">{condition.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-ink-muted">
                    Accepted: {condition.status === 'ACCEPTED' || acceptedAt ? 'Yes' : 'No'}
                    {condition.acceptedAt
                      ? ` · ${formatDisplayDate(condition.acceptedAt)}`
                      : acceptedAt
                        ? ` · ${formatDisplayDate(acceptedAt)}`
                        : ''}
                  </p>
                  {condition.complianceNotes ? (
                    <p className="mt-1 text-sm text-ink-secondary">Notes: {condition.complianceNotes}</p>
                  ) : null}
                  {linked ? (
                    <p className="mt-1 text-sm text-ink-secondary">
                      Related deduction: {linked.title}
                    </p>
                  ) : null}
                </div>
                <Badge
                  tone={
                    condition.complianceStatus === 'COMPLIED'
                      ? 'success'
                      : condition.complianceStatus === 'NOT_COMPLIED'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {COMPLIANCE_OPTIONS.find((o) => o.value === condition.complianceStatus)?.label ||
                    condition.complianceStatus}
                </Badge>
              </div>
              {evidence ? (
                <img
                  src={resolveMediaUrl(evidence)}
                  alt="Condition compliance evidence"
                  className="mt-3 h-20 w-20 rounded-lg object-cover"
                />
              ) : null}
              {isOwner && onReview ? (
                <div className="mt-3 space-y-2">
                  <Select
                    label="Move-Out compliance"
                    value={condition.complianceStatus}
                    options={COMPLIANCE_OPTIONS}
                    onChange={(e) =>
                      onReview(condition, { complianceStatus: e.target.value as ComplianceStatus })
                    }
                  />
                  <Textarea
                    label="Notes"
                    defaultValue={condition.complianceNotes || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (condition.complianceNotes || '')) {
                        onReview(condition, {
                          complianceStatus: condition.complianceStatus,
                          complianceNotes: e.target.value,
                        })
                      }
                    }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      onReview(condition, {
                        complianceStatus: condition.complianceStatus,
                        evidenceDataUrl: await fileToDataUrl(file),
                      })
                    }}
                  />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function RoomHandoverContext({
  roomName,
  baselineSummary,
  requests,
}: {
  roomName: string
  baselineSummary?: string
  requests: PropertyChangeRequest[]
}) {
  if (!requests.length && !baselineSummary) return null
  return (
    <Card className="border-brand-200 bg-brand-50/30">
      <h3 className="font-bold text-ink">{roomName}</h3>
      {baselineSummary ? (
        <p className="mt-2 text-sm text-ink-secondary">
          <span className="font-semibold text-ink">Move-In: </span>
          {baselineSummary}
        </p>
      ) : null}
      {requests.map((request) => (
        <div key={request.id} className="mt-3 rounded-xl bg-white px-3 py-2 text-sm">
          <p className="font-semibold text-ink">Approved Change: {request.title}</p>
          {request.ownerConditions ? (
            <p className="mt-1 text-ink-secondary">Owner Condition: {request.ownerConditions}</p>
          ) : null}
        </div>
      ))}
    </Card>
  )
}
