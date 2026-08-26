import { ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function InspectionWizardPage() {
  return (
    <div>
      <PageHeader title="Inspection Wizard" description="Room-by-room condition recording." />
      <EmptyState
        icon={ClipboardCheck}
        title="No active inspection step"
        description="The inspection wizard will open when a move-in or move-out inspection is in progress."
      />
    </div>
  )
}
