import { Lock } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'

export function InspectionApprovalPage() {
  const { user } = useAuth()
  const [tenantApproved, setTenantApproved] = useState(user?.role === 'OWNER')
  const [ownerApproved, setOwnerApproved] = useState(true)
  const locked = ownerApproved && tenantApproved

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Move-In Inspection Submitted"
        description="Green Residency — B-204 · shared condition record"
      />

      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
            <span className="font-semibold text-ink">Owner Approval</span>
            <Badge tone={ownerApproved ? 'success' : 'warning'}>
              {ownerApproved ? '✓ Approved' : 'Pending'}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
            <span className="font-semibold text-ink">Tenant Approval</span>
            <Badge tone={tenantApproved ? 'success' : 'warning'}>
              {tenantApproved ? '✓ Approved' : 'Pending'}
            </Badge>
          </div>
        </div>

        {!locked && user?.role === 'TENANT' && !tenantApproved ? (
          <Button className="mt-6 w-full" onClick={() => setTenantApproved(true)}>
            Approve Inspection
          </Button>
        ) : null}

        {!locked && user?.role === 'OWNER' && !ownerApproved ? (
          <Button className="mt-6 w-full" onClick={() => setOwnerApproved(true)}>
            Approve Inspection
          </Button>
        ) : null}

        {!locked && tenantApproved !== ownerApproved ? (
          <p className="mt-4 text-sm text-ink-secondary">
            We&apos;ll notify you when the other party reviews the inspection.
          </p>
        ) : null}
      </Card>

      {locked ? (
        <Card className="border-brand-200 bg-brand-50/50 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-ink">Move-In Record Locked</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            This inspection has been approved by both parties and is now the official property
            baseline.
          </p>
          <p className="mt-3 text-sm font-semibold text-ink">01 June 2026 · 4:12 PM</p>
        </Card>
      ) : null}
    </div>
  )
}
