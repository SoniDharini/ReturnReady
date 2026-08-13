import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ConditionSelector, type Condition } from '@/components/shared/ConditionSelector'
import { EvidenceUpload } from '@/components/shared/EvidenceUpload'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { accessItems, meters, rooms, samplePhotos } from '@/data/mock'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, CircleDot } from 'lucide-react'

type WizardStep = 'rooms' | 'meters' | 'keys'

export function InspectionWizardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [roomIndex, setRoomIndex] = useState(2)
  const [itemIndex, setItemIndex] = useState(0)
  const [condition, setCondition] = useState<Condition | null>('Good')
  const [photos, setPhotos] = useState(samplePhotos)
  const [section, setSection] = useState<WizardStep>('rooms')
  const isMoveOut = location.pathname.includes('move-out')

  const room = rooms[roomIndex]
  const item = room?.items[itemIndex]
  const showDamagePrompt = condition === 'Fair' || condition === 'Damaged'

  const roomNav = useMemo(
    () =>
      rooms.map((r, index) => ({
        ...r,
        active: index === roomIndex && section === 'rooms',
      })),
    [roomIndex, section],
  )

  const goNext = () => {
    if (section === 'rooms') {
      if (itemIndex < room.items.length - 1) {
        setItemIndex((i) => i + 1)
        setCondition('Good')
        return
      }
      if (roomIndex < rooms.length - 1) {
        setRoomIndex((i) => i + 1)
        setItemIndex(0)
        setCondition('Good')
        return
      }
      setSection('meters')
      return
    }
    if (section === 'meters') {
      setSection('keys')
      return
    }
    navigate('/app/inspections/review')
  }

  const goPrev = () => {
    if (section === 'keys') {
      setSection('meters')
      return
    }
    if (section === 'meters') {
      setSection('rooms')
      setRoomIndex(rooms.length - 1)
      setItemIndex(rooms[rooms.length - 1].items.length - 1)
      return
    }
    if (itemIndex > 0) {
      setItemIndex((i) => i - 1)
      return
    }
    if (roomIndex > 0) {
      const prev = roomIndex - 1
      setRoomIndex(prev)
      setItemIndex(rooms[prev].items.length - 1)
    }
  }

  return (
    <div className="pb-24 lg:pb-0">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink">{isMoveOut ? 'Move-Out' : 'Move-In'} Inspection</h1>
        <p className="text-sm text-ink-secondary">Green Residency — B-204</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
        <aside className="hidden lg:block">
          <Card className="sticky top-24 space-y-1 p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Rooms</p>
            {roomNav.map((r, index) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSection('rooms')
                  setRoomIndex(index)
                  setItemIndex(0)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-semibold',
                  r.active ? 'bg-brand-50 text-brand-700' : 'text-ink-secondary hover:bg-surface-muted',
                )}
              >
                {r.inspectionStatus === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : r.inspectionStatus === 'in_progress' || r.active ? (
                  <CircleDot className="h-4 w-4 text-brand-600" />
                ) : (
                  <Circle className="h-4 w-4 text-ink-muted" />
                )}
                {r.name}
              </button>
            ))}
            <div className="my-2 border-t border-border" />
            <button
              type="button"
              onClick={() => setSection('meters')}
              className={cn(
                'w-full rounded-xl px-2.5 py-2 text-left text-sm font-semibold',
                section === 'meters' ? 'bg-brand-50 text-brand-700' : 'text-ink-secondary hover:bg-surface-muted',
              )}
            >
              Utility Readings
            </button>
            <button
              type="button"
              onClick={() => setSection('keys')}
              className={cn(
                'w-full rounded-xl px-2.5 py-2 text-left text-sm font-semibold',
                section === 'keys' ? 'bg-brand-50 text-brand-700' : 'text-ink-secondary hover:bg-surface-muted',
              )}
            >
              Keys & Access
            </button>
          </Card>
        </aside>

        <div className="space-y-4">
          {section === 'rooms' && item ? (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-ink">{room.name}</h2>
                  <p className="text-sm text-ink-muted">
                    Item {itemIndex + 1} of {room.items.length}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-bold text-ink">{item.name}</h3>
                <p className="text-sm text-ink-secondary">{item.description}</p>
              </div>

              {isMoveOut ? (
                <div className="mt-4 rounded-xl bg-surface-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Move-In Condition</p>
                  <p className="mt-1 font-semibold text-ink">Good</p>
                  <p className="mt-1 text-sm text-ink-secondary">Small stain on the left cushion.</p>
                </div>
              ) : null}

              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-ink">Current condition</p>
                <ConditionSelector value={condition} onChange={setCondition} />
              </div>

              {showDamagePrompt ? (
                <div className="mt-4">
                  <Textarea
                    label="Describe the existing issue"
                    placeholder="Example: Small crack near the bottom-left corner."
                    defaultValue="Small stain on the left cushion."
                  />
                </div>
              ) : null}

              <div className="mt-4">
                <Textarea
                  label="Add any notes about this item"
                  placeholder="Example: Small stain on the left cushion."
                />
              </div>

              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-ink">Photo Evidence</p>
                <EvidenceUpload photos={photos} onRemove={(id) => setPhotos((p) => p.filter((x) => x.id !== id))} />
              </div>
            </Card>
          ) : null}

          {section === 'meters' ? (
            <Card>
              <h2 className="text-xl font-bold text-ink">Utility Readings</h2>
              <p className="mt-1 text-sm text-ink-secondary">Capture meter readings with photo evidence.</p>
              <div className="mt-6 space-y-4">
                {meters.map((meter) => (
                  <div key={meter.id} className="rounded-2xl border border-border p-4">
                    <h3 className="font-bold text-ink">{meter.name}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Input label="Reading" defaultValue={meter.reading} />
                      <Input label="Unit" defaultValue={meter.unit} />
                    </div>
                    <Button variant="secondary" size="sm" className="mt-3">
                      Upload Meter Photo
                    </Button>
                  </div>
                ))}
                <Button variant="secondary">+ Add Another Meter</Button>
              </div>
            </Card>
          ) : null}

          {section === 'keys' ? (
            <Card>
              <h2 className="text-xl font-bold text-ink">Keys & Access Items</h2>
              <div className="mt-6 space-y-3">
                {accessItems.map((access) => (
                  <div
                    key={access.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-3"
                  >
                    <p className="font-semibold text-ink">{access.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink-muted">Quantity</span>
                      <Input
                        aria-label={`${access.name} quantity`}
                        type="number"
                        defaultValue={access.quantity}
                        className="w-20"
                      />
                    </div>
                  </div>
                ))}
                <Button variant="secondary">+ Add Access Item</Button>
              </div>
            </Card>
          ) : null}

          <div className="hidden justify-between gap-2 lg:flex">
            <Button variant="secondary" onClick={goPrev}>
              Previous
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/app/inspections/review')}>
                Save Draft
              </Button>
              <Button onClick={goNext}>Save & Next</Button>
            </div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <Card className="sticky top-24">
            <h3 className="font-bold text-ink">Progress</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-ink-secondary">Rooms</span>
                <span className="font-semibold">4/7</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink-secondary">Current</span>
                <span className="font-semibold">{section === 'rooms' ? room?.name : section}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink-secondary">Photos</span>
                <span className="font-semibold">{photos.length}</span>
              </li>
            </ul>
            <Button variant="secondary" className="mt-5 w-full" onClick={() => navigate('/app/inspections/review')}>
              Review Summary
            </Button>
          </Card>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white p-3 lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button variant="secondary" className="flex-1" onClick={goPrev}>
            Previous
          </Button>
          <Button className="flex-1" onClick={goNext}>
            Save & Next
          </Button>
        </div>
      </div>
    </div>
  )
}
