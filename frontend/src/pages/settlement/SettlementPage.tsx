import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/services/api'
import {
  createDeduction,
  deleteDeduction,
  listDeductions,
  listDamageAssessments,
} from '@/services/settlement.service'
import type { DamageAssessment, Deduction, DeductionSummary } from '@/types'

export function SettlementPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const tenancyId = searchParams.get('tenancyId') || ''
  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [assessments, setAssessments] = useState<DamageAssessment[]>([])
  const [summary, setSummary] = useState<DeductionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [saving, setSaving] = useState(false)

  const isOwner = user?.role === 'OWNER'
  const deductibleAssessments = assessments.filter((a) => a.deductionRequired)

  const load = async () => {
    if (!tenancyId) return
    setLoading(true)
    try {
      const [deductionData, assessmentList] = await Promise.all([
        listDeductions(tenancyId),
        listDamageAssessments(tenancyId),
      ])
      setDeductions(deductionData.deductions)
      setSummary(deductionData.summary)
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
      const result = await createDeduction(tenancyId, {
        title: title.trim(),
        description,
        amount: parsedAmount,
        damageAssessmentId: selectedAssessmentId || null,
      })
      setDeductions((prev) => [result.deduction, ...prev])
      setSummary(result.summary)
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
      const nextSummary = await deleteDeduction(id)
      setDeductions((prev) => prev.filter((d) => d.id !== id))
      setSummary(nextSummary)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to remove deduction'))
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
        description="Review proposed deductions and projected refund."
      />

      {summary ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Financial Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Security Deposit</dt>
              <dd className="font-semibold">{formatCurrency(summary.securityDeposit)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Total Proposed</dt>
              <dd className="font-semibold">{formatCurrency(summary.totalProposedDeductions)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-semibold text-ink">Projected Refund</dt>
              <dd className="font-bold text-brand-700">{formatCurrency(summary.projectedRefund)}</dd>
            </div>
          </dl>
          {summary.exceedsDeposit ? (
            <div className="mt-4 rounded-xl bg-warning-bg px-3 py-2 text-sm text-warning">
              Deductions exceed the security deposit. Proposed:{' '}
              {formatCurrency(summary.totalProposedDeductions)} · Deposit:{' '}
              {formatCurrency(summary.securityDeposit)}
            </div>
          ) : null}
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
        <h2 className="text-lg font-bold text-ink">Proposed Deductions</h2>
        {deductions.length === 0 ? (
          <p className="mt-3 text-sm text-ink-secondary">No deductions proposed.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {deductions.map((deduction) => (
              <li
                key={deduction.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-ink">{deduction.title}</p>
                  {deduction.description ? (
                    <p className="mt-1 text-sm text-ink-secondary">{deduction.description}</p>
                  ) : null}
                  <Badge className="mt-2" status="Proposed">
                    {deduction.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-bold text-ink">{formatCurrency(deduction.amount)}</p>
                  {isOwner ? (
                    <Button
                      variant="tertiary"
                      size="sm"
                      className="mt-2"
                      onClick={() => void handleDelete(deduction.id)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  )
}
