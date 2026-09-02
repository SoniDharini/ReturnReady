import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { resolveMediaUrl } from '@/services/property.service'
import { getSettlement } from '@/services/settlement.service'

export function AccessClosedPage() {
  const [params] = useSearchParams()
  const property = params.get('property') || 'your rental'
  const tenancyId = params.get('tenancyId') || ''
  const [reportUrl, setReportUrl] = useState('')

  useEffect(() => {
    if (!tenancyId) return
    void (async () => {
      try {
        const data = await getSettlement(tenancyId)
        if (data.report?.fileUrl) {
          setReportUrl(resolveMediaUrl(data.report.fileUrl))
        }
      } catch {
        // Report may not be available
      }
    })()
  }, [tenancyId])

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10">
      <Card className="w-full max-w-lg p-8 text-center">
        <div className="mx-auto mb-6 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
          RR
        </div>
        <h1 className="text-2xl font-bold text-ink">Rental Handover Completed</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Your tenancy for <span className="font-semibold text-ink">{property}</span> has been
          completed. Active workspace access is closed.
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          Historical evidence and the final report remain preserved. You can no longer modify
          inspections, deductions, or settlement details.
        </p>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {reportUrl ? (
            <a
              href={reportUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <FileText className="h-4 w-4" />
              Download Final Report
            </a>
          ) : null}
          <Link to="/">
            <Button variant="secondary" className="w-full">
              Back to ReturnReady
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
