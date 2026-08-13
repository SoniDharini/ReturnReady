import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { rooms, tenancies } from '@/data/mock'
import { cn } from '@/lib/utils'

const tabs = ['Overview', 'Rooms & Inventory', 'Tenancies', 'Reports'] as const

export function PropertyDetailsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview')
  const [expanded, setExpanded] = useState<string>('r1')

  return (
    <div>
      <PageHeader
        title="Green Residency — B-204"
        description="Satellite, Ahmedabad"
        actions={
          <>
            <Badge status="Active">Active</Badge>
            <Button variant="secondary">Edit Property</Button>
            <Button onClick={() => navigate('/app/tenancies/new')}>Create Tenancy</Button>
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
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="font-bold text-ink">Property Summary</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-ink-muted">Type</dt>
                <dd className="mt-1 font-semibold">Apartment</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Rooms</dt>
                <dd className="mt-1 font-semibold">7 rooms · 2 bathrooms</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Address</dt>
                <dd className="mt-1 font-semibold">Satellite Road, Ahmedabad, Gujarat 380015</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Current Tenant</dt>
                <dd className="mt-1 font-semibold">Aaditya Shah</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h2 className="font-bold text-ink">Next Action</h2>
            <p className="mt-2 text-sm text-ink-secondary">
              Move-out comparison is ready for Green Residency.
            </p>
            <Button className="mt-4 w-full" onClick={() => navigate('/app/inspections/comparison')}>
              Review Comparison
            </Button>
          </Card>
        </div>
      ) : null}

      {tab === 'Rooms & Inventory' ? (
        <div className="space-y-3">
          {rooms.map((room) => {
            const open = expanded === room.id
            return (
              <Card key={room.id} className="p-0 overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                  onClick={() => setExpanded(open ? '' : room.id)}
                >
                  <div>
                    <h3 className="font-bold text-ink">{room.name}</h3>
                    <p className="text-sm text-ink-muted">{room.items.length} inventory items</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={(e) => e.stopPropagation()}>
                      Edit Room
                    </Button>
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </button>
                {open ? (
                  <div className="border-t border-border px-5 py-4">
                    <div className="space-y-3">
                      {room.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-ink">{item.name}</p>
                            <p className="text-sm text-ink-secondary">
                              Qty {item.quantity} · {item.description}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="tertiary" size="sm">
                              Edit
                            </Button>
                            <Button variant="tertiary" size="icon" aria-label="Delete item">
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="secondary" size="sm" className="mt-4">
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                ) : null}
              </Card>
            )
          })}
          <Button variant="secondary">
            <Plus className="h-4 w-4" />
            Add Room
          </Button>
        </div>
      ) : null}

      {tab === 'Tenancies' ? (
        <div className="space-y-3">
          {tenancies
            .filter((t) => t.propertyId === 'p1')
            .map((tenancy) => (
              <Card key={tenancy.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{tenancy.tenantName}</p>
                    <p className="text-sm text-ink-secondary">
                      {tenancy.moveIn} – {tenancy.moveOut}
                    </p>
                  </div>
                  <Badge status={tenancy.status}>{tenancy.status}</Badge>
                </div>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => navigate(`/app/tenancies/${tenancy.id}`)}
                >
                  View Tenancy
                </Button>
              </Card>
            ))}
        </div>
      ) : null}

      {tab === 'Reports' ? (
        <Card>
          <p className="text-sm text-ink-secondary">
            Completed handover reports for this property will appear here.
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => navigate('/app/reports')}>
            Go to Reports
          </Button>
        </Card>
      ) : null}
    </div>
  )
}
