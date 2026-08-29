import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, ChevronDown, ChevronRight, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import {
  deletePropertyImage,
  getProperty,
  resolveMediaUrl,
  updatePropertyImageCaption,
  uploadPropertyImages,
} from '@/services/property.service'
import { getErrorMessage } from '@/services/api'
import type { Property } from '@/types'
import { cn } from '@/lib/utils'
import { useAppPaths } from '@/hooks/useAppPaths'
import { countRoomsByType, groupRooms } from '@/lib/propertyRooms'

const tabs = ['Overview', 'Rooms', 'Photos', 'Tenancies'] as const

export function PropertyDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview')
  const [expanded, setExpanded] = useState<string>('')
  const [property, setProperty] = useState<Property | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const data = await getProperty(id)
    setProperty(data)
    setExpanded(data.roomList?.[0]?.id || data.roomList?.[0]?.name || '')
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        await load()
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load property'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (id) void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const roomGroups = useMemo(() => groupRooms(property?.roomList || []), [property])
  const bedroomCount = countRoomsByType(property?.roomList || [], 'BEDROOM')
  const bathroomCount = countRoomsByType(property?.roomList || [], 'BATHROOM')
  const otherCount = (property?.roomList || []).filter(
    (room) => room.type !== 'BEDROOM' && room.type !== 'BATHROOM',
  ).length

  if (loading) return <p className="text-sm text-ink-secondary">Loading property...</p>
  if (error || !property) {
    return <p className="text-sm text-danger">{error || 'Property not found'}</p>
  }

  const uploadMore = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    setError('')
    try {
      const updated = await uploadPropertyImages(property.id, Array.from(files))
      setProperty(updated)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to upload photos'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={property.name}
        description={`${property.type} · ${property.address}, ${property.city}`}
        actions={
          <>
            <Badge status={property.status}>{property.status}</Badge>
            <Button variant="secondary" onClick={() => navigate(paths.propertyEdit(property.id))}>
              <Pencil className="h-4 w-4" />
              Edit Property
            </Button>
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
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-ink-muted">Bedrooms</dt>
              <dd className="mt-1 font-semibold">{bedroomCount}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Bathrooms</dt>
              <dd className="mt-1 font-semibold">{bathroomCount}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Other Rooms</dt>
              <dd className="mt-1 font-semibold">{otherCount}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Total Rooms</dt>
              <dd className="mt-1 font-semibold">{property.roomList?.length || property.rooms || 0}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Photos</dt>
              <dd className="mt-1 font-semibold">{property.images?.length || 0}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Current Tenant</dt>
              <dd className="mt-1 font-semibold">{property.activeTenancy || 'None'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-muted">Address</dt>
              <dd className="mt-1 font-semibold">
                {property.address}, {property.city}, {property.state} {property.pin}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {tab === 'Rooms' ? (
        <div className="space-y-6">
          {[
            { title: 'Bedrooms', rooms: roomGroups.bedrooms },
            { title: 'Bathrooms', rooms: roomGroups.bathrooms },
            { title: 'Other', rooms: roomGroups.other },
          ].map((group) =>
            group.rooms.length === 0 ? null : (
              <div key={group.title} className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
                  {group.title}
                </h3>
                {group.rooms.map((room) => {
                  const roomKey = room.id || room.name
                  const open = expanded === roomKey
                  return (
                    <Card key={roomKey} className="overflow-hidden p-0">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-5 py-4 text-left"
                        onClick={() => setExpanded(open ? '' : roomKey)}
                      >
                        <div>
                          <h3 className="font-bold text-ink">{room.name}</h3>
                          <p className="text-sm text-ink-muted">
                            {(room.items || []).length} inventory items
                          </p>
                        </div>
                        {open ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      {open ? (
                        <div className="border-t border-border px-5 py-4">
                          {(room.items || []).length === 0 ? (
                            <p className="text-sm text-ink-muted">No inventory items yet.</p>
                          ) : (
                            <div className="space-y-3">
                              {room.items.map((item) => (
                                <div
                                  key={`${item.name}-${item.quantity}`}
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
                })}
              </div>
            ),
          )}
          {(property.roomList || []).length === 0 ? (
            <Card>
              <p className="text-sm text-ink-secondary">No rooms added yet.</p>
            </Card>
          ) : null}
          <Button variant="secondary" onClick={() => navigate(paths.propertyEdit(property.id))}>
            <Plus className="h-4 w-4" />
            Edit Rooms
          </Button>
        </div>
      ) : null}

      {tab === 'Photos' ? (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink">Property Photos</h2>
                <p className="text-sm text-ink-secondary">
                  Before-handover photos linked to this property.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Add Photos'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  void uploadMore(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>
          </Card>

          {(property.images || []).length === 0 ? (
            <Card>
              <p className="text-sm text-ink-secondary">No photos uploaded yet.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {property.images?.map((image) => (
                <Card key={image.id || image.imageUrl} className="overflow-hidden p-0">
                  <img
                    src={resolveMediaUrl(image.imageUrl)}
                    alt={image.caption || property.name}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="space-y-3 p-4">
                    <Input
                      label="Caption"
                      value={image.caption || ''}
                      onChange={(e) => {
                        const caption = e.target.value
                        setProperty((prev) =>
                          prev
                            ? {
                                ...prev,
                                images: (prev.images || []).map((item) =>
                                  item.id === image.id ? { ...item, caption } : item,
                                ),
                              }
                            : prev,
                        )
                      }}
                      onBlur={async (e) => {
                        if (!image.id) return
                        try {
                          const updated = await updatePropertyImageCaption(
                            property.id,
                            image.id,
                            e.target.value,
                          )
                          setProperty(updated)
                        } catch (err) {
                          setError(getErrorMessage(err, 'Unable to update caption'))
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        if (!image.id) return
                        try {
                          const updated = await deletePropertyImage(property.id, image.id)
                          setProperty(updated)
                        } catch (err) {
                          setError(getErrorMessage(err, 'Unable to remove photo'))
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
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
    </div>
  )
}
