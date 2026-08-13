import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

export function SettlementCompletePage() {
  const navigate = useNavigate()

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
            <dd className="font-semibold">Green Residency — B-204</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Rental Period</dt>
            <dd className="font-semibold">01 Jun 2026 – 31 May 2027</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Deposit</dt>
            <dd className="font-semibold">{formatCurrency(50000)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Deductions</dt>
            <dd className="font-semibold">{formatCurrency(4700)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Refund</dt>
            <dd className="font-semibold text-brand-700">{formatCurrency(45300)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Inspection Completion</dt>
            <dd className="font-semibold">Move-in & Move-out locked</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Signatures</dt>
            <dd className="font-semibold">Owner & Tenant signed</dd>
          </div>
        </dl>
      </Card>

      <div className="flex flex-wrap justify-center gap-2">
        <Button size="lg">
          <Download className="h-4 w-4" />
          Download Final Report
        </Button>
        <Button size="lg" variant="secondary" onClick={() => navigate('/app/reports')}>
          <FileText className="h-4 w-4" />
          View Report
        </Button>
      </div>
    </div>
  )
}
