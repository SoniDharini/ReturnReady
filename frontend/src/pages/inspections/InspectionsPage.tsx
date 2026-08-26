import { ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function InspectionsPage() {
  return (
    <div>
      <PageHeader
        title="Inspections"
        description="Document property condition with photos, notes, and approvals."
      />
      <EmptyState
        icon={ClipboardCheck}
        title="No inspections yet"
        description="Inspections appear here once a tenancy is active and a handover begins."
      />
    </div>
  )
}
