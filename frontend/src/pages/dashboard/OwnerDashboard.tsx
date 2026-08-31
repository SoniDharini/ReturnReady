import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { listProperties } from '@/services/property.service'
import { listTenancies } from '@/services/tenancy.service'
import { listTenancyInspections } from '@/services/inspection.service'
import { getErrorMessage } from '@/services/api'
import type { Inspection, Property, Tenancy } from '@/types'
import { appPaths } from '@/lib/paths'
import {
  formatDisplayDate,
  getOccupancyLabel,
  getOwnerAction,
} from '@/lib/tenancyContext'

export function OwnerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const paths = appPaths('OWNER')
  const firstName = user?.name.split(' ')[0] || 'there'
  const [properties, setProperties] = useState<Property[]>([])
  const [tenancies, setTenancies] = useState<Tenancy[]>([])
  const [inspectionsByTenancy, setInspectionsByTenancy] = useState<Record<string, Inspection[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [props, tens] = await Promise.all([listProperties(), listTenancies()])
        const inspectionEntries = await Promise.all(
          tens.map(async (tenancy) => {
            try {
              const inspections = await listTenancyInspections(tenancy.id)
              return [tenancy.id, inspections] as const
            } catch {
              return [tenancy.id, [] as Inspection[]] as const
            }
          }),
        )
        if (!cancelled) {
          setProperties(props.filter((p) => p.status !== 'Archived'))
          setTenancies(tens)
          setInspectionsByTenancy(Object.fromEntries(inspectionEntries))
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

  const tenancyByProperty = useMemo(() => {
    const map = new Map<string, Tenancy>()
    for (const tenancy of tenancies) {
      if (tenancy.inviteStatus === 'Cancelled') continue
      const existing = map.get(tenancy.propertyId)
      if (!existing || tenancy.inviteStatus === 'Accepted') {
        map.set(tenancy.propertyId, tenancy)
      }
    }
    return map
  }, [tenancies])

  if (loading) return <p className="text-sm text-ink-secondary">Loading dashboard...</p>

  if (properties.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Welcome, ${firstName}`} description="Manage your rental properties." />
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property to start using ReturnReady."
          actionLabel="Add Property"
          onAction={() => navigate(paths.propertyNew)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Your properties and what needs attention right now."
        actions={
          <Button onClick={() => navigate(paths.propertyNew)}>
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        }
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <section>
        <h2 className="mb-4 text-lg font-bold text-ink">Your Properties</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {properties.map((property) => {
            const tenancy = tenancyByProperty.get(property.id)
            const inspections = tenancy ? inspectionsByTenancy[tenancy.id] || [] : []
            const action = getOwnerAction(tenancy, inspections, {
              ...paths,
              tenancyNew: `${paths.tenancies}/new?propertyId=${property.id}`,
            })

            return (
              <Card key={property.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-ink">{property.name}</h3>
                    <p className="mt-1 text-sm capitalize text-ink-secondary">{property.type}</p>
                    <p className="text-sm text-ink-muted">
                      {property.address}, {property.city}
                    </p>
                  </div>
                  <Badge status={tenancy ? 'Active' : 'Draft'}>
                    {tenancy ? getOccupancyLabel(tenancy) : 'Vacant'}
                  </Badge>
                </div>

                {tenancy ? (
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-ink-muted">Tenant</dt>
                      <dd className="font-semibold text-ink">{tenancy.tenantName}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Move-In</dt>
                      <dd className="font-semibold text-ink">{formatDisplayDate(tenancy.moveIn)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Expected Move-Out</dt>
                      <dd className="font-semibold text-ink">{formatDisplayDate(tenancy.moveOut)}</dd>
                    </div>
                    {tenancy.actualMoveOut ? (
                      <div>
                        <dt className="text-ink-muted">Actual Move-Out</dt>
                        <dd className="font-semibold text-ink">
                          {formatDisplayDate(tenancy.actualMoveOut)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-ink-secondary">No active tenant for this property.</p>
                )}

                <div className="mt-4 rounded-xl bg-surface-muted px-4 py-3">
                  <p className="text-sm font-semibold text-ink">{action.title}</p>
                  <p className="mt-1 text-sm text-ink-secondary">{action.description}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {action.label && action.path ? (
                    <Button
                      onClick={() => navigate(action.path!)}
                      variant={action.kind === 'action' ? 'primary' : 'secondary'}
                    >
                      {action.label}
                    </Button>
                  ) : null}
                  <Button variant="secondary" onClick={() => navigate(paths.property(property.id))}>
                    View Property
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
