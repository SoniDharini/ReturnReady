import { ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function InspectionReviewPage() {
  return (
    <div>
      <PageHeader title="Inspection Summary" description="Review before submitting for approval." />
      <EmptyState
        icon={ClipboardCheck}
        title="Nothing to review"
        description="Complete an inspection first to see the summary."
      />
    </div>
  )
}
