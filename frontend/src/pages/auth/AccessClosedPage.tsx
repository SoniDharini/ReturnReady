import { Link, useSearchParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function AccessClosedPage() {
  const [params] = useSearchParams()
  const property = params.get('property') || 'your rental'

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10">
      <Card className="w-full max-w-lg p-8 text-center">
        <div className="mx-auto mb-6 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
          RR
        </div>
        <h1 className="text-2xl font-bold text-ink">Your ReturnReady access has ended</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Your tenancy for <span className="font-semibold text-ink">{property}</span> has been
          successfully completed. The active workspace is now closed.
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          Historical evidence and the final report remain preserved. You can no longer modify
          inspections, deductions, or settlement details.
        </p>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button>
            <FileText className="h-4 w-4" />
            Download Final Handover Report
          </Button>
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
