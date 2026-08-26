import { ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function InspectionDashboardPage() {
  return (
    <div>
      <PageHeader title="Move-In Inspection" description="Start once rooms and inventory are ready." />
      <EmptyState
        icon={ClipboardCheck}
        title="Inspection not started"
        description="Move-in inspections will be available here for active tenancies."
      />
    </div>
  )
}
