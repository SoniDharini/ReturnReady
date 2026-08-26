import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ClipboardCheck, KeyRound, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'
import { listProperties } from '@/services/property.service'
import { listTenancies } from '@/services/tenancy.service'
import { getErrorMessage } from '@/services/api'
import type { Tenancy } from '@/types'
import { appPaths } from '@/lib/paths'

export function OwnerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const paths = appPaths('OWNER')
  const firstName = user?.name.split(' ')[0] || 'there'
  const [propertyCount, setPropertyCount] = useState(0)
  const [tenancies, setTenancies] = useState<Tenancy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [props, tens] = await Promise.all([listProperties(), listTenancies()])
        if (!cancelled) {
          setPropertyCount(props.length)
          setTenancies(tens)
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load dashboard'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const isEmpty = propertyCount === 0 && tenancies.length === 0

  if (loading) return <p className="text-sm text-ink-secondary">Loading dashboard...</p>

  if (isEmpty) {
    return (
      <div className="space-y-8">
        <PageHeader title={`Welcome, ${firstName}`} description="Start your first rental handover" />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Card className="border-brand-200 bg-brand-50/40">
          <h2 className="text-xl font-bold text-ink">Start your first rental handover</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-secondary">
            Add a property and invite your tenant to begin documenting the property condition.
          </p>
          <Button className="mt-5" onClick={() => navigate(paths.propertyNew)}>
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </Card>
        <section>
          <h2 className="mb-4 text-lg font-bold text-ink">How ReturnReady Works</h2>
          <ol className="space-y-0">
            {[
              { title: 'Add your property', desc: 'Create rooms and inventory.' },
              { title: 'Invite your tenant', desc: 'Send them a secure invitation.' },
              {
                title: 'Complete the move-in inspection',
                desc: 'Both sides review and approve the condition record.',
              },
            ].map((step, index) => (
              <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
                {index < 2 ? (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border" />
                ) : null}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div>
                  <p className="font-bold text-ink">{step.title}</p>
                  <p className="mt-1 text-sm text-ink-secondary">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    )
  }

  const pendingInvites = tenancies.filter((t) => t.inviteStatus === 'Pending').length

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Manage your properties, inspections and tenancy handovers."
        actions={
          <Button onClick={() => navigate(paths.propertyNew)}>
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        }
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-ink-muted">Properties</p>
              <p className="mt-2 text-3xl font-bold text-ink">{propertyCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-ink-muted">Tenancies</p>
              <p className="mt-2 text-3xl font-bold text-ink">{tenancies.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <KeyRound className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-ink-muted">Pending Invitations</p>
              <p className="mt-2 text-3xl font-bold text-ink">{pendingInvites}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Your Tenancies</h2>
          <Button variant="tertiary" size="sm" onClick={() => navigate(paths.tenancies)}>
            View all
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {tenancies.slice(0, 4).map((tenancy) => (
            <Card key={tenancy.id} interactive>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink">{tenancy.propertyName}</h3>
                  <p className="mt-1 text-sm text-ink-secondary">Tenant: {tenancy.tenantName}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {tenancy.moveIn} – {tenancy.moveOut}
                  </p>
                </div>
                <Badge status={tenancy.status}>{tenancy.status}</Badge>
              </div>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => navigate(paths.tenancy(tenancy.id))}
              >
                View Tenancy
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
