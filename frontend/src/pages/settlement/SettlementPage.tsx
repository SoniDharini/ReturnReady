import { Receipt } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function SettlementPage() {
  return (
    <div>
      <PageHeader
        title="Security Deposit Settlement"
        description="Review deductions and expected refund."
      />
      <EmptyState
        icon={Receipt}
        title="No settlement yet"
        description="Settlement details appear after move-out comparison and deductions are prepared."
      />
    </div>
  )
}
