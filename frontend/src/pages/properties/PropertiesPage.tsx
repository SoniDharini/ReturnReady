import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, MoreHorizontal, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/context/AuthContext'
import { properties } from '@/data/mock'

export function PropertiesPage() {
  const navigate = useNavigate()
  const { demoMode } = useAuth()
  const [menuId, setMenuId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  if (demoMode === 'empty') {
    return (
      <div>
        <PageHeader
          title="Properties"
          description="Manage properties used across your tenancies and inspections."
        />
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property to start creating tenancies and inspections."
          actionLabel="+ Add Property"
          onAction={() => navigate('/app/properties/new')}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Manage properties used across your tenancies and inspections."
        actions={
          <Button onClick={() => navigate('/app/properties/new')}>
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        }
      />

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-ink-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Property</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">Rooms</th>
              <th className="px-5 py-3 font-semibold">Active Tenancy</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id} className="border-b border-border last:border-0">
                <td className="px-5 py-4">
                  <p className="font-semibold text-ink">{property.name}</p>
                  <p className="text-ink-muted">
                    {property.address}, {property.city}
                  </p>
                </td>
                <td className="px-5 py-4 text-ink-secondary">{property.type}</td>
                <td className="px-5 py-4 text-ink-secondary">{property.rooms}</td>
                <td className="px-5 py-4 text-ink-secondary">{property.activeTenancy || '—'}</td>
                <td className="px-5 py-4">
                  <Badge status={property.status}>{property.status}</Badge>
                </td>
                <td className="relative px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/app/properties/${property.id}`)}>
                      View
                    </Button>
                    <Button
                      variant="tertiary"
                      size="icon"
                      aria-label="More actions"
                      onClick={() => setMenuId(menuId === property.id ? null : property.id)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  {menuId === property.id ? (
                    <div className="absolute right-5 z-10 mt-1 w-36 rounded-xl border border-border bg-white p-1 shadow-elevated">
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted"
                        onClick={() => navigate(`/app/properties/${property.id}`)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-bg"
                        onClick={() => {
                          setDeleteId(property.id)
                          setMenuId(null)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {properties.map((property) => (
          <Card key={property.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-ink">{property.name}</h3>
                <p className="mt-1 text-sm text-ink-secondary">
                  {property.address}, {property.city}
                </p>
              </div>
              <Badge status={property.status}>{property.status}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-ink-muted">Type</dt>
                <dd className="font-medium text-ink">{property.type}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Rooms</dt>
                <dd className="font-medium text-ink">{property.rooms}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-ink-muted">Active Tenancy</dt>
                <dd className="font-medium text-ink">{property.activeTenancy || 'None'}</dd>
              </div>
            </dl>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => navigate(`/app/properties/${property.id}`)}>
              View
            </Button>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete Property?"
        description="This property will be permanently removed if it has no active tenancy."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setDeleteId(null)}>
              Delete Property
            </Button>
          </>
        }
      />
    </div>
  )
}
