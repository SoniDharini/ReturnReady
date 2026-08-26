import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/context/AuthContext'
import { useAppPaths } from '@/hooks/useAppPaths'
import { createProperty } from '@/services/property.service'
import { getErrorMessage } from '@/services/api'

export function AddPropertyPage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const { refreshUser } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [roomNames, setRoomNames] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '',
    type: 'apartment',
    address: '',
    city: '',
    state: '',
    pin: '',
  })

  const submit = async (status: 'Active' | 'Draft') => {
    setError('')
    setLoading(true)
    try {
      const property = await createProperty({
        ...form,
        status,
        rooms: roomNames.length,
        bathrooms: 0,
        roomList: roomNames.map((name) => ({ name, items: [] })),
      })
      await refreshUser()
      navigate(paths.property(property.id))
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save property'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add Property"
        description="Start with basic details, then define rooms and inventory."
      />

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          void submit('Active')
        }}
      >
        <Card>
          <h2 className="text-lg font-bold text-ink">Property Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Property Name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Green Residency — B-204"
              className="sm:col-span-2"
              required
            />
            <Select
              label="Property Type"
              name="type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              options={[
                { value: 'apartment', label: 'Apartment' },
                { value: 'villa', label: 'Villa' },
                { value: 'studio', label: 'Studio' },
                { value: 'house', label: 'Independent House' },
              ]}
            />
            <Input
              label="Address"
              name="address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Street / society"
              required
            />
            <Input
              label="City"
              name="city"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Ahmedabad"
              required
            />
            <Input
              label="State"
              name="state"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              placeholder="Gujarat"
              required
            />
            <Input
              label="PIN Code"
              name="pin"
              value={form.pin}
              onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
              placeholder="380015"
              required
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-ink">Rooms</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Add Living Room, Bedroom, Kitchen, Bathroom, Balcony, or a custom room.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Balcony', 'Custom Room'].map(
              (room) => (
                <Button
                  key={room}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const name =
                      room === 'Custom Room'
                        ? `Room ${roomNames.length + 1}`
                        : room
                    setRoomNames((prev) => [...prev, name])
                  }}
                >
                  + {room}
                </Button>
              ),
            )}
          </div>
          {roomNames.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm text-ink-secondary">
              {roomNames.map((name, index) => (
                <li key={`${name}-${index}`} className="rounded-xl bg-surface-muted px-3 py-2">
                  {name}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => void submit('Draft')}
          >
            Save as Draft
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Property'}
          </Button>
        </div>
      </form>
    </div>
  )
}
