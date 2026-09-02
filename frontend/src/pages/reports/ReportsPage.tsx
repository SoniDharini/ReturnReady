import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDisplayDate } from '@/lib/tenancyContext'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/services/api'
import { resolveMediaUrl } from '@/services/property.service'
import { listReports } from '@/services/settlement.service'
import type { HandoverReport } from '@/types'

export function ReportsPage() {
  const [reports, setReports] = useState<HandoverReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const items = await listReports()
        setReports(items)
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load reports'))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div>
      <PageHeader title="Reports" description="Download completed handover reports." />

      {loading ? <p className="text-sm text-ink-secondary">Loading reports...</p> : null}

      {!loading && reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Reports Yet"
          description="Completed handover reports will appear here."
        />
      ) : null}

      {reports.length > 0 ? (
        <ul className="space-y-4">
          {reports.map((report) => {
            const snapshot = report.snapshot as {
              finalRefund?: number
              propertyName?: string
              tenantName?: string
            } | undefined
            const refund =
              snapshot?.finalRefund ??
              (typeof report.snapshot === 'object' &&
              report.snapshot &&
              'finalRefund' in report.snapshot
                ? Number((report.snapshot as { finalRefund: number }).finalRefund)
                : 0)

            return (
              <li key={report.id}>
                <Card className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-ink">
                      {report.propertyName || snapshot?.propertyName || 'Handover Report'}
                    </h2>
                    {report.tenantName || snapshot?.tenantName ? (
                      <p className="mt-1 text-sm text-ink-secondary">
                        Tenant: {report.tenantName || snapshot?.tenantName}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm text-ink-muted">
                      Completed: {formatDisplayDate(report.completedAt || report.generatedAt)}
                    </p>
                    {refund > 0 ? (
                      <p className="mt-1 text-sm font-semibold text-brand-700">
                        Final Refund: {formatCurrency(refund)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={resolveMediaUrl(report.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border-strong bg-white px-3 text-sm font-semibold text-ink hover:bg-surface-muted"
                    >
                      View Report
                    </a>
                    <a
                      href={resolveMediaUrl(report.fileUrl)}
                      download
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      ) : null}

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </div>
  )
}
