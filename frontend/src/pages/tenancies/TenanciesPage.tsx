import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAppPaths } from '@/hooks/useAppPaths'
import { listTenancies } from '@/services/tenancy.service'
import { getErrorMessage } from '@/services/api'
import type { Tenancy } from '@/types'

export function TenanciesPage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [tenancies, setTenancies] = useState<Tenancy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listTenancies()
        if (!cancelled) setTenancies(data)
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load tenancies'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="text-sm text-ink-secondary">Loading tenancies...</p>

  if (!error && tenancies.length === 0) {
    return (
      <div>
        <PageHeader title="Tenancies" description="Invite tenants and track rental handovers." />
        <EmptyState
          icon={KeyRound}
          title="No tenancies yet"
          description="Create a tenancy to invite a tenant and begin the handover workflow."
          actionLabel="+ Invite Tenant"
          onAction={() => navigate(paths.tenancyNew)}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Tenancies"
        description="Invite tenants and track rental handovers."
        actions={
          <Button onClick={() => navigate(paths.tenancyNew)}>
            <Plus className="h-4 w-4" />
            Invite Tenant
          </Button>
        }
      />
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
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
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => navigate(paths.tenancy(tenancy.id))}
            >
              View Tenancy
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
