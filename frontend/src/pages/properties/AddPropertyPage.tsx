import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export function AddPropertyPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add Property"
        description="Start with basic details, then define the property structure."
      />

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          navigate('/app/properties/p1')
        }}
      >
        <Card>
          <h2 className="text-lg font-bold text-ink">Property Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Property Name" name="name" placeholder="Green Residency — B-204" className="sm:col-span-2" required />
            <Select
              label="Property Type"
              name="type"
              options={[
                { value: 'apartment', label: 'Apartment' },
                { value: 'villa', label: 'Villa' },
                { value: 'studio', label: 'Studio' },
                { value: 'house', label: 'Independent House' },
              ]}
            />
            <Input label="Address" name="address" placeholder="Street / society" required />
            <Input label="City" name="city" placeholder="Ahmedabad" required />
            <Input label="State" name="state" placeholder="Gujarat" required />
            <Input label="PIN Code" name="pin" placeholder="380015" required />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-ink">Property Structure</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            You can refine rooms and inventory after saving.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Input label="Number of Bedrooms" type="number" name="bedrooms" defaultValue={2} min={0} />
            <Input label="Bathrooms" type="number" name="bathrooms" defaultValue={2} min={0} />
            <Input label="Additional Spaces" type="number" name="extra" defaultValue={2} min={0} hint="Kitchen, balcony, etc." />
          </div>
          <Button type="button" variant="secondary" className="mt-4">
            + Add Room Manually
          </Button>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/app/properties')}>
            Save as Draft
          </Button>
          <Button type="submit">Save & Continue</Button>
        </div>
      </form>
    </div>
  )
}
