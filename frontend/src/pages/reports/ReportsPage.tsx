import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function ReportsPage() {
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
