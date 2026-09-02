import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAppPaths } from '@/hooks/useAppPaths'
import { formatDisplayDate } from '@/lib/tenancyContext'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/services/api'
import { resolveMediaUrl } from '@/services/property.service'
import { getSettlement } from '@/services/settlement.service'
import type { SettlementData } from '@/types'

export function SettlementCompletePage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [searchParams] = useSearchParams()
  const tenancyId = searchParams.get('tenancyId') || ''

  const [data, setData] = useState<SettlementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!tenancyId) {
      setLoading(false)
      return
    }
    void (async () => {
      try {
        const result = await getSettlement(tenancyId)
        setData(result)
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load completion summary'))
      } finally {
        setLoading(false)
      }
    })()
  }, [tenancyId])

  const reportUrl = data?.report?.fileUrl ? resolveMediaUrl(data.report.fileUrl) : ''
  const tenancy = data?.tenancy
  const settlement = data?.settlement
  const refund = settlement?.finalRefund ?? data?.financials?.finalRefund ?? 0
  const deductions = settlement?.finalDeductionTotal ?? data?.financials?.finalDeductionTotal ?? 0

  if (!tenancyId) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No tenancy selected"
        description="Complete a settlement to view the handover summary."
      />
    )
  }

  if (loading) return <p className="text-sm text-ink-secondary">Loading summary...</p>

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-ink">Property Handover Complete</h1>
        <p className="mt-2 text-ink-secondary">
          The tenancy handover has been completed and signed by both parties.
        </p>
      </div>

      <Card className="text-left">
        <h2 className="font-bold text-ink">Summary</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Property</dt>
            <dd className="font-semibold">{tenancy?.propertyName || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Tenant</dt>
            <dd className="font-semibold">{tenancy?.tenantName || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Rental Period</dt>
            <dd className="font-semibold">
              {formatDisplayDate(tenancy?.moveIn)} – {formatDisplayDate(tenancy?.moveOut)}
            </dd>
          </div>
          {tenancy?.actualMoveOut ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Actual Move-Out</dt>
              <dd className="font-semibold">{formatDisplayDate(tenancy.actualMoveOut)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Deposit</dt>
            <dd className="font-semibold">{formatCurrency(tenancy?.deposit ?? 0)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Deductions</dt>
            <dd className="font-semibold">{formatCurrency(deductions)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Refund</dt>
            <dd className="font-semibold text-brand-700">{formatCurrency(refund)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Signatures</dt>
            <dd className="font-semibold">
              {settlement?.ownerSigned && settlement?.tenantSigned
                ? 'Owner & Tenant signed'
                : 'Pending'}
            </dd>
          </div>
        </dl>
      </Card>

      <div className="flex flex-wrap justify-center gap-2">
        {reportUrl ? (
          <a
            href={reportUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-base font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <Download className="h-4 w-4" />
            Download Final Report
          </a>
        ) : null}
        <Button size="lg" variant="secondary" onClick={() => navigate(paths.reports)}>
          <FileText className="h-4 w-4" />
          View Reports
        </Button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  )
}
