import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { reports } from '@/data/mock'
import { cn } from '@/lib/utils'

const filters = ['All', 'Completed', 'Active'] as const

export function ReportsPage() {
  const { demoMode } = useAuth()
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')

  if (demoMode === 'empty') {
    return (
      <div>
        <PageHeader title="Reports" description="Download completed handover reports." />
        <EmptyState
          icon={FileText}
          title="No Reports Yet"
          description="Completed handover reports will appear here."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Reports" description="Download completed handover reports." />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-semibold',
              filter === item ? 'bg-brand-600 text-white' : 'border border-border bg-white text-ink-secondary',
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-ink-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Property</th>
              <th className="px-5 py-3 font-semibold">Tenant / Owner</th>
              <th className="px-5 py-3 font-semibold">Rental Period</th>
              <th className="px-5 py-3 font-semibold">Completed Date</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Report</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="px-5 py-4 font-semibold text-ink">{report.property}</td>
                <td className="px-5 py-4 text-ink-secondary">{report.party}</td>
                <td className="px-5 py-4 text-ink-secondary">{report.period}</td>
                <td className="px-5 py-4 text-ink-secondary">{report.completedDate}</td>
                <td className="px-5 py-4">
                  <Badge status={report.status}>{report.status}</Badge>
                </td>
                <td className="px-5 py-4">
                  <Button size="sm" variant="secondary">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {reports.map((report) => (
          <Card key={report.id}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-ink">{report.property}</h3>
              <Badge status={report.status}>{report.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-ink-secondary">{report.party}</p>
            <p className="text-sm text-ink-muted">{report.period}</p>
            <p className="mt-1 text-sm text-ink-muted">Completed {report.completedDate}</p>
            <Button className="mt-4 w-full" variant="secondary">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
