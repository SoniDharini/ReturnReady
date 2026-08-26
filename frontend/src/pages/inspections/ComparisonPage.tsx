import { GitCompare } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function ComparisonPage() {
  return (
    <div>
      <PageHeader
        title="Move-In vs Move-Out"
        description="Review changes identified during the property handover."
      />
      <EmptyState
        icon={GitCompare}
        title="No comparison available"
        description="Comparisons appear after both move-in and move-out inspections are completed."
      />
    </div>
  )
}
