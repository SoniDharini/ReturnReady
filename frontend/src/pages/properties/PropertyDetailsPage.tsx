import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getProperty } from '@/services/property.service'
import { getErrorMessage } from '@/services/api'
import type { Property } from '@/types'
import { cn } from '@/lib/utils'
import { useAppPaths } from '@/hooks/useAppPaths'

const tabs = ['Overview', 'Rooms & Inventory', 'Tenancies', 'Reports'] as const

export function PropertyDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview')
  const [expanded, setExpanded] = useState<string>('')
  const [property, setProperty] = useState<Property | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await getProperty(id)
        if (!cancelled) {
          setProperty(data)
          setExpanded(data.roomList?.[0]?.id || '')
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load property'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (id) void load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <p className="text-sm text-ink-secondary">Loading property...</p>
  if (error || !property) {
    return <p className="text-sm text-danger">{error || 'Property not found'}</p>
  }

  return (
    <div>
      <PageHeader
        title={property.name}
        description={`${property.address}, ${property.city}`}
        actions={
          <>
            <Badge status={property.status}>{property.status}</Badge>
            <Button onClick={() => navigate(paths.tenancyNew)}>Invite Tenant</Button>
          </>
        }
      />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-surface-subtle p-1">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              'whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              tab === item ? 'bg-white text-ink shadow-sm' : 'text-ink-secondary hover:text-ink',
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Overview' ? (
        <Card>
          <h2 className="font-bold text-ink">Property Summary</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Type</dt>
              <dd className="mt-1 font-semibold capitalize">{property.type}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Rooms</dt>
              <dd className="mt-1 font-semibold">
                {property.rooms} rooms · {property.bathrooms} bathrooms
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Address</dt>
              <dd className="mt-1 font-semibold">
                {property.address}, {property.city}, {property.state} {property.pin}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Current Tenant</dt>
              <dd className="mt-1 font-semibold">{property.activeTenancy || 'None'}</dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {tab === 'Rooms & Inventory' ? (
        <div className="space-y-3">
          {(property.roomList || []).length === 0 ? (
            <Card>
              <p className="text-sm text-ink-secondary">No rooms added yet.</p>
            </Card>
          ) : (
            property.roomList?.map((room) => {
              const open = expanded === room.id
              return (
                <Card key={room.id || room.name} className="overflow-hidden p-0">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                    onClick={() => setExpanded(open ? '' : room.id || room.name)}
                  >
                    <div>
                      <h3 className="font-bold text-ink">{room.name}</h3>
                      <p className="text-sm text-ink-muted">{room.items.length} inventory items</p>
                    </div>
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {open ? (
                    <div className="border-t border-border px-5 py-4">
                      {room.items.length === 0 ? (
                        <p className="text-sm text-ink-muted">No inventory items yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {room.items.map((item) => (
                            <div
                              key={item.name}
                              className="rounded-xl bg-surface-muted px-4 py-3 text-sm"
                            >
                              <p className="font-semibold text-ink">{item.name}</p>
                              <p className="text-ink-secondary">
                                Qty {item.quantity}
                                {item.description ? ` · ${item.description}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </Card>
              )
            })
          )}
          <Button variant="secondary" disabled>
            <Plus className="h-4 w-4" />
            Add Room
          </Button>
        </div>
      ) : null}

      {tab === 'Tenancies' ? (
        <Card>
          <p className="text-sm text-ink-secondary">Manage invitations from the Tenancies page.</p>
          <Button className="mt-4" variant="secondary" onClick={() => navigate(paths.tenancies)}>
            Go to Tenancies
          </Button>
        </Card>
      ) : null}

      {tab === 'Reports' ? (
        <Card>
          <p className="text-sm text-ink-secondary">
            Completed handover reports for this property will appear here.
          </p>
        </Card>
      ) : null}
    </div>
  )
}
