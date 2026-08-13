import { useNavigate } from 'react-router-dom'
import { KeyRound, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { tenancies } from '@/data/mock'

export function TenanciesPage() {
  const navigate = useNavigate()
  const { demoMode } = useAuth()

  if (demoMode === 'empty') {
    return (
      <div>
        <PageHeader title="Tenancies" description="Track invitations, active rentals, and settlements." />
        <EmptyState
          icon={KeyRound}
          title="No tenancies yet"
          description="Create a tenancy to invite a tenant and begin the handover workflow."
          actionLabel="+ Create Tenancy"
          onAction={() => navigate('/app/tenancies/new')}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Tenancies"
        description="Track invitations, active rentals, and settlements."
        actions={
          <Button onClick={() => navigate('/app/tenancies/new')}>
            <Plus className="h-4 w-4" />
            Create Tenancy
          </Button>
        }
      />
      <div className="grid gap-4">
        {tenancies.map((tenancy) => (
          <Card key={tenancy.id} interactive>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-ink">{tenancy.propertyName}</h3>
                <p className="mt-1 text-sm text-ink-secondary">Tenant: {tenancy.tenantName}</p>
                <p className="text-sm text-ink-muted">
                  {tenancy.moveIn} – {tenancy.moveOut}
                </p>
              </div>
              <Badge status={tenancy.status}>{tenancy.status}</Badge>
            </div>
            <Button className="mt-4" variant="secondary" onClick={() => navigate(`/app/tenancies/${tenancy.id}`)}>
              View Tenancy
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
