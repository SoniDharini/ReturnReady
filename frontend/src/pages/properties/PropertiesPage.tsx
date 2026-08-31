import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, MoreHorizontal, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useAppPaths } from '@/hooks/useAppPaths'
import { deleteProperty, listProperties } from '@/services/property.service'
import { getErrorMessage } from '@/services/api'
import type { Property } from '@/types'

export function PropertiesPage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setProperties((await listProperties()).filter((p) => p.status !== 'Archived'))
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load properties'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) {
    return <p className="text-sm text-ink-secondary">Loading properties...</p>
  }

  if (!error && properties.length === 0) {
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
          onAction={() => navigate(paths.propertyNew)}
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
          <Button onClick={() => navigate(paths.propertyNew)}>
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        }
      />

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

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
                <td className="px-5 py-4 capitalize text-ink-secondary">{property.type}</td>
                <td className="px-5 py-4 text-ink-secondary">{property.rooms}</td>
                <td className="px-5 py-4 text-ink-secondary">{property.activeTenancy || '—'}</td>
                <td className="px-5 py-4">
                  <Badge status={property.status}>{property.status}</Badge>
                </td>
                <td className="relative px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(paths.property(property.id))}
                    >
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
                    <div className="absolute right-5 z-10 mt-1 w-40 rounded-xl border border-border bg-white p-1 shadow-elevated">
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted"
                        onClick={() => {
                          navigate(paths.propertyEdit(property.id))
                          setMenuId(null)
                        }}
                      >
                        Edit Property
                      </button>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-bg"
                        onClick={() => {
                          setDeleteId(property.id)
                          setMenuId(null)
                        }}
                      >
                        Delete Property
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
            <Button
              className="mt-4 w-full"
              variant="secondary"
              onClick={() => navigate(paths.property(property.id))}
            >
              View
            </Button>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete Property?"
        description={
          deleteId
            ? `You are about to delete ${properties.find((p) => p.id === deleteId)?.name || 'this property'}. Properties with rental history will be archived instead of permanently deleted.`
            : ''
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteId) return
                try {
                  const result = await deleteProperty(deleteId)
                  setDeleteId(null)
                  setError(
                    result.archived
                      ? 'Property archived to preserve rental history.'
                      : '',
                  )
                  await load()
                } catch (err) {
                  setError(getErrorMessage(err, 'Unable to delete property'))
                  setDeleteId(null)
                }
              }}
            >
              Delete Property
            </Button>
          </>
        }
      />
    </div>
  )
}
