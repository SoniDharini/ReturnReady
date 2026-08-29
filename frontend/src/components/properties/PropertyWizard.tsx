import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImagePlus, Pencil, Trash2, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { QuantityStepper } from '@/components/properties/QuantityStepper'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import {
  STANDARD_ROOM_DEFS,
  addCustomRooms,
  applyQuantityChange,
  countRoomsByType,
  planQuantityChange,
  summarizeLayout,
} from '@/lib/propertyRooms'
import { cn } from '@/lib/utils'
import type { Property, PropertyRoom } from '@/types'
import {
  createProperty,
  deletePropertyImage,
  resolveMediaUrl,
  updateProperty,
  updatePropertyImageCaption,
  uploadPropertyImages,
} from '@/services/property.service'
import { getErrorMessage } from '@/services/api'

const STEPS = [
  { id: 1, label: 'Property Details' },
  { id: 2, label: 'Property Layout' },
  { id: 3, label: 'Property Images' },
  { id: 4, label: 'Review & Save' },
] as const

type PendingImage = {
  key: string
  file?: File
  previewUrl: string
  caption: string
  existingId?: string
}

type PropertyWizardProps = {
  mode: 'create' | 'edit'
  initial?: Property | null
  onCancel: () => void
  onSuccess: (property: Property, meta: { created: boolean }) => void
}

function emptyDetails() {
  return {
    name: '',
    type: 'apartment',
    address: '',
    city: '',
    state: '',
    pin: '',
  }
}

export function PropertyWizard({ mode, initial, onCancel, onSuccess }: PropertyWizardProps) {
  const [step, setStep] = useState(1)
  const [details, setDetails] = useState(emptyDetails)
  const [rooms, setRooms] = useState<PropertyRoom[]>([])
  const [images, setImages] = useState<PendingImage[]>([])
  const [removedExistingImageIds, setRemovedExistingImageIds] = useState<string[]>([])
  const [status, setStatus] = useState<'Active' | 'Draft'>('Active')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingRoomKey, setEditingRoomKey] = useState<string | null>(null)
  const [editingRoomName, setEditingRoomName] = useState('')
  const [customName, setCustomName] = useState('')
  const [customQty, setCustomQty] = useState(1)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [confirmReduce, setConfirmReduce] = useState<{
    type: (typeof STANDARD_ROOM_DEFS)[number]['type']
    singular: string
    nextCount: number
    removed: PropertyRoom[]
  } | null>(null)
  const [confirmRemoveRoom, setConfirmRemoveRoom] = useState<PropertyRoom | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!initial) return
    setDetails({
      name: initial.name || '',
      type: initial.type || 'apartment',
      address: initial.address || '',
      city: initial.city || '',
      state: initial.state || '',
      pin: initial.pin || '',
    })
    setStatus((initial.status as 'Active' | 'Draft') || 'Active')
    setRooms(
      (initial.roomList || []).map((room, index) => ({
        ...room,
        key: room.id || `existing-${index}`,
        type: room.type || 'CUSTOM',
        isCustom: Boolean(room.isCustom || room.type === 'CUSTOM'),
        items: room.items || [],
      })),
    )
    setImages(
      (initial.images || []).map((image, index) => ({
        key: image.id || `img-${index}`,
        previewUrl: resolveMediaUrl(image.imageUrl),
        caption: image.caption || '',
        existingId: image.id,
      })),
    )
  }, [initial])

  useEffect(() => {
    return () => {
      images.forEach((image) => {
        if (image.file && image.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(image.previewUrl)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const layoutSummary = useMemo(() => summarizeLayout(rooms), [rooms])

  const validateDetails = () => {
    if (!details.name.trim()) return 'Property name is required'
    if (!details.address.trim()) return 'Address is required'
    if (!details.city.trim()) return 'City is required'
    if (!details.state.trim()) return 'State is required'
    if (!details.pin.trim()) return 'PIN code is required'
    return ''
  }

  const goNext = () => {
    setError('')
    if (step === 1) {
      const message = validateDetails()
      if (message) {
        setError(message)
        return
      }
    }
    setStep((s) => Math.min(4, s + 1))
  }

  const goBack = () => {
    setError('')
    setStep((s) => Math.max(1, s - 1))
  }

  const handleQuantityChange = (
    type: (typeof STANDARD_ROOM_DEFS)[number]['type'],
    singular: string,
    nextCount: number,
  ) => {
    const plan = planQuantityChange(rooms, type, nextCount, singular)
    if (plan.removed.length > 0) {
      const hasInventory = plan.removed.some((room) => (room.items || []).length > 0)
      if (hasInventory || mode === 'edit') {
        setConfirmReduce({ type, singular, nextCount, removed: plan.removed })
        return
      }
    }
    setRooms(plan.nextRooms)
  }

  const confirmQuantityReduce = () => {
    if (!confirmReduce) return
    setRooms(
      applyQuantityChange(
        rooms,
        confirmReduce.type,
        confirmReduce.nextCount,
        confirmReduce.singular,
      ),
    )
    setConfirmReduce(null)
  }

  const startEditRoom = (room: PropertyRoom) => {
    setEditingRoomKey(room.key || room.id || room.name)
    setEditingRoomName(room.name)
  }

  const saveRoomName = () => {
    if (!editingRoomKey) return
    const name = editingRoomName.trim()
    if (!name) return
    setRooms((prev) =>
      prev.map((room) =>
        (room.key || room.id || room.name) === editingRoomKey ? { ...room, name } : room,
      ),
    )
    setEditingRoomKey(null)
    setEditingRoomName('')
  }

  const removeRoom = (room: PropertyRoom) => {
    if ((room.items || []).length > 0 || mode === 'edit') {
      setConfirmRemoveRoom(room)
      return
    }
    setRooms((prev) => prev.filter((r) => (r.key || r.id) !== (room.key || room.id)))
  }

  const confirmRoomRemoval = () => {
    if (!confirmRemoveRoom) return
    const target = confirmRemoveRoom.key || confirmRemoveRoom.id
    setRooms((prev) => prev.filter((r) => (r.key || r.id) !== target))
    setConfirmRemoveRoom(null)
  }

  const addCustom = () => {
    if (!customName.trim()) return
    setRooms((prev) => addCustomRooms(prev, customName, customQty))
    setCustomName('')
    setCustomQty(1)
    setShowCustomForm(false)
  }

  const onPickFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return
    const next: PendingImage[] = []
    Array.from(fileList).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      next.push({
        key: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
      })
    })
    setImages((prev) => [...prev, ...next])
  }

  const removeImage = (image: PendingImage) => {
    if (image.existingId) {
      setRemovedExistingImageIds((prev) => [...prev, image.existingId!])
    }
    if (image.file && image.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(image.previewUrl)
    }
    setImages((prev) => prev.filter((item) => item.key !== image.key))
  }

  const save = async (nextStatus: 'Active' | 'Draft' = status) => {
    setError('')
    const message = validateDetails()
    if (message) {
      setError(message)
      setStep(1)
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...details,
        status: nextStatus,
        rooms: rooms.length,
        bathrooms: countRoomsByType(rooms, 'BATHROOM'),
        roomList: rooms.map(({ name, type, isCustom, items, id }) => ({
          ...(id ? { id } : {}),
          name,
          type,
          isCustom,
          items: items || [],
        })),
      }

      let property: Property
      if (mode === 'edit' && initial?.id) {
        property = await updateProperty(initial.id, payload)
        for (const imageId of removedExistingImageIds) {
          property = await deletePropertyImage(property.id, imageId)
        }
      } else {
        property = await createProperty(payload)
      }

      const newFiles = images.filter((image) => image.file)
      if (newFiles.length > 0) {
        property = await uploadPropertyImages(
          property.id,
          newFiles.map((image) => image.file!),
          newFiles.map((image) => image.caption),
        )
      }

      if (mode === 'edit' && initial?.id) {
        for (const image of images) {
          if (!image.existingId) continue
          const original = initial.images?.find((item) => item.id === image.existingId)
          if ((original?.caption || '') !== image.caption) {
            property = await updatePropertyImageCaption(
              property.id,
              image.existingId,
              image.caption,
            )
          }
        }
      }

      onSuccess(property, { created: mode === 'create' })
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save property'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={mode === 'edit' ? 'Edit Property' : 'Add Property'}
        description="Enter details, set room quantities, upload photos, then review and save."
      />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id < step) setStep(item.id)
            }}
            className={cn(
              'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              step === item.id
                ? 'bg-brand-600 text-white'
                : step > item.id
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-surface-muted text-ink-muted',
            )}
          >
            {item.id}. {item.label}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">1. Property Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Property Name"
              value={details.name}
              onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))}
              placeholder="Green Residency — B-204"
              className="sm:col-span-2"
              required
            />
            <Select
              label="Property Type"
              value={details.type}
              onChange={(e) => setDetails((d) => ({ ...d, type: e.target.value }))}
              options={[
                { value: 'apartment', label: 'Apartment' },
                { value: 'house', label: 'House' },
                { value: 'villa', label: 'Villa' },
                { value: 'pg', label: 'PG' },
                { value: 'office', label: 'Office' },
                { value: 'studio', label: 'Studio' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input
              label="Address"
              value={details.address}
              onChange={(e) => setDetails((d) => ({ ...d, address: e.target.value }))}
              placeholder="Street / society"
              required
            />
            <Input
              label="City"
              value={details.city}
              onChange={(e) => setDetails((d) => ({ ...d, city: e.target.value }))}
              placeholder="Ahmedabad"
              required
            />
            <Input
              label="State"
              value={details.state}
              onChange={(e) => setDetails((d) => ({ ...d, state: e.target.value }))}
              placeholder="Gujarat"
              required
            />
            <Input
              label="PIN Code"
              value={details.pin}
              onChange={(e) => setDetails((d) => ({ ...d, pin: e.target.value }))}
              placeholder="380015"
              required
            />
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-bold text-ink">2. Property Layout</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Tell us how many rooms this property has. You can change these later.
            </p>
            <div className="mt-4 space-y-3">
              {STANDARD_ROOM_DEFS.map((def) => (
                <QuantityStepper
                  key={def.type}
                  label={def.label}
                  value={countRoomsByType(rooms, def.type)}
                  onChange={(value) => handleQuantityChange(def.type, def.singular, value)}
                />
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-ink">Rooms to be Created</h3>
                <p className="text-sm text-ink-secondary">
                  {rooms.length} room{rooms.length === 1 ? '' : 's'} · rename or remove anytime
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCustomForm(true)}>
                + Add Custom Room
              </Button>
            </div>

            {showCustomForm ? (
              <div className="mt-4 rounded-xl border border-border bg-surface-muted p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    label="Room Name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Study Room"
                  />
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-ink">Quantity</p>
                    <QuantityStepper label="" value={customQty} min={1} onChange={setCustomQty} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" onClick={addCustom}>
                    Add
                  </Button>
                  <Button type="button" variant="tertiary" onClick={() => setShowCustomForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {rooms.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">
                No rooms yet. Use the quantity selectors above to generate rooms.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {rooms.map((room) => {
                  const key = room.key || room.id || room.name
                  const editing = editingRoomKey === key
                  return (
                    <li
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-muted px-3 py-2"
                    >
                      {editing ? (
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Input
                            value={editingRoomName}
                            onChange={(e) => setEditingRoomName(e.target.value)}
                            className="min-w-0 flex-1"
                          />
                          <Button type="button" size="sm" onClick={saveRoomName}>
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="tertiary"
                            onClick={() => setEditingRoomKey(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{room.name}</p>
                            <p className="text-xs text-ink-muted">
                              {room.isCustom ? 'Custom' : room.type.replaceAll('_', ' ').toLowerCase()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="tertiary"
                              aria-label={`Edit ${room.name}`}
                              onClick={() => startEditRoom(room)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="tertiary"
                              aria-label={`Remove ${room.name}`}
                              onClick={() => removeRoom(room)}
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          </div>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {step === 3 ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">3. Property Images</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Upload clear photos of the property before the tenancy starts. These images help create
            an initial visual record of the property.
          </p>

          <div
            className="mt-5 rounded-2xl border border-dashed border-border-strong bg-surface-muted px-4 py-10 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              onPickFiles(e.dataTransfer.files)
            }}
          >
            <ImagePlus className="mx-auto h-8 w-8 text-brand-700" />
            <p className="mt-3 text-sm font-semibold text-ink">Drag and drop images here</p>
            <p className="mt-1 text-sm text-ink-secondary">or</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Choose Photos
              </Button>
              <Button type="button" variant="secondary" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onPickFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                onPickFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          {images.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {images.map((image) => (
                <div key={image.key} className="overflow-hidden rounded-xl border border-border">
                  <div className="relative aspect-[4/3] bg-surface-muted">
                    <img
                      src={image.previewUrl}
                      alt={image.caption || 'Property photo'}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-ink shadow-sm"
                      onClick={() => removeImage(image)}
                      aria-label="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    <Input
                      label="Caption (optional)"
                      value={image.caption}
                      placeholder="Living Room - Main Wall"
                      onChange={(e) =>
                        setImages((prev) =>
                          prev.map((item) =>
                            item.key === image.key ? { ...item, caption: e.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">No photos added yet. You can skip this step.</p>
          )}
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Property Summary</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="text-xl font-bold text-ink">{details.name || 'Untitled property'}</p>
              <p className="capitalize text-ink-secondary">{details.type}</p>
              <p className="text-ink-secondary">
                {details.address}
                {details.city ? `, ${details.city}` : ''}
                {details.state ? `, ${details.state}` : ''} {details.pin}
              </p>
            </div>

            <div className="rounded-xl bg-surface-muted p-4">
              <p className="font-semibold text-ink">Layout</p>
              {layoutSummary.length === 0 ? (
                <p className="mt-2 text-ink-muted">No rooms configured</p>
              ) : (
                <ul className="mt-2 space-y-1 text-ink-secondary">
                  {layoutSummary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              <p className="mt-3 font-semibold text-ink">{rooms.length} Rooms Total</p>
            </div>

            <div>
              <p className="font-semibold text-ink">Property Images</p>
              <p className="mt-1 text-ink-secondary">
                {images.length} photo{images.length === 1 ? '' : 's'} uploaded
              </p>
              {images.length > 0 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {images.slice(0, 6).map((image) => (
                    <img
                      key={image.key}
                      src={image.previewUrl}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      <div className="mt-6 flex flex-wrap justify-between gap-2">
        <Button type="button" variant="tertiary" onClick={step === 1 ? onCancel : goBack}>
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        <div className="flex flex-wrap gap-2">
          {step === 4 ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => {
                  setStatus('Draft')
                  void save('Draft')
                }}
              >
                Save as Draft
              </Button>
              <Button type="button" disabled={loading} onClick={() => void save('Active')}>
                {loading ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Save Property'}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(confirmReduce)}
        onClose={() => setConfirmReduce(null)}
        title={`Reduce ${confirmReduce?.singular || 'room'} count?`}
        description={
          confirmReduce
            ? `${confirmReduce.removed.map((r) => r.name).join(', ')} will be removed from this property.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReduce(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmQuantityReduce}>
              Remove {confirmReduce?.singular || 'Room'}
            </Button>
          </>
        }
      />

      <Modal
        open={Boolean(confirmRemoveRoom)}
        onClose={() => setConfirmRemoveRoom(null)}
        title={`Remove ${confirmRemoveRoom?.name || 'room'}?`}
        description="This room will be removed from the property."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemoveRoom(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRoomRemoval}>
              Remove Room
            </Button>
          </>
        }
      />
    </div>
  )
}
