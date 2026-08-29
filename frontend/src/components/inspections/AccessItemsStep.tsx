import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { QuantityStepper } from '@/components/properties/QuantityStepper'
import { Textarea } from '@/components/ui/Textarea'
import { addAccessItem, deleteAccessItem, updateAccessItem } from '@/services/inspection.service'
import { getErrorMessage } from '@/services/api'
import type { AccessItem } from '@/types'

const PRESETS = [
  'Main Door Key',
  'Bedroom Key',
  'Mailbox Key',
  'Parking Remote',
  'Access Card',
  'Gate Remote',
  'Building Access Key',
]

type AccessItemsStepProps = {
  inspectionId: string
  items: AccessItem[]
  disabled?: boolean
  onChange: () => void
}

export function AccessItemsStep({
  inspectionId,
  items,
  disabled,
  onChange,
}: AccessItemsStepProps) {
  const [error, setError] = useState('')
  const [customName, setCustomName] = useState('')
  const [customQty, setCustomQty] = useState(1)
  const [customNotes, setCustomNotes] = useState('')

  const addPreset = async (name: string) => {
    if (items.some((i) => i.name === name)) return
    try {
      await addAccessItem(inspectionId, { name, quantity: 1 })
      onChange()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const addCustom = async () => {
    if (!customName.trim()) return
    try {
      await addAccessItem(inspectionId, {
        name: customName.trim(),
        quantity: customQty,
        notes: customNotes,
      })
      setCustomName('')
      setCustomQty(1)
      setCustomNotes('')
      onChange()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink">Keys & Access</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Document keys and access devices handed to the tenant at move-in.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((name) => (
          <Button
            key={name}
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || items.some((i) => i.name === name)}
            onClick={() => void addPreset(name)}
          >
            <Plus className="h-4 w-4" />
            {name}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No access items added yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <AccessItemRow
              key={item.id}
              item={item}
              disabled={disabled}
              onChange={onChange}
              onRemove={async () => {
                await deleteAccessItem(item.id)
                onChange()
              }}
            />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface-muted p-4">
        <h3 className="font-semibold text-ink">Add Custom Access Item</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            label="Item Name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Terrace Key"
          />
          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">Quantity</p>
            <QuantityStepper label="" value={customQty} min={1} onChange={setCustomQty} />
          </div>
          <Textarea
            className="sm:col-span-2"
            label="Notes (optional)"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
          />
        </div>
        <Button className="mt-3" type="button" disabled={disabled} onClick={() => void addCustom()}>
          Add Access Item
        </Button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  )
}

function AccessItemRow({
  item,
  disabled,
  onChange,
  onRemove,
}: {
  item: AccessItem
  disabled?: boolean
  onChange: () => void
  onRemove: () => Promise<void>
}) {
  const [quantity, setQuantity] = useState(item.quantity)
  const [notes, setNotes] = useState(item.notes || '')

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{item.name}</p>
          <div className="mt-3 max-w-xs">
            <p className="mb-1.5 text-sm font-semibold text-ink">Quantity</p>
            <QuantityStepper
              label=""
              value={quantity}
              min={1}
              disabled={disabled}
              onChange={async (value) => {
                setQuantity(value)
                await updateAccessItem(item.id, { quantity: value, notes })
                onChange()
              }}
            />
          </div>
          <Textarea
            className="mt-3"
            label="Notes"
            value={notes}
            disabled={disabled}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={async () => {
              if (notes !== (item.notes || '')) {
                await updateAccessItem(item.id, { quantity, notes })
                onChange()
              }
            }}
          />
        </div>
        {!disabled ? (
          <Button type="button" variant="tertiary" size="sm" onClick={() => void onRemove()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
