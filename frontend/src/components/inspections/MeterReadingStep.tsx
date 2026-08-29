import { useState } from 'react'
import { Camera, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import {
  addMeterReading,
  deleteMeterReading,
  resolveInspectionImageUrl,
  updateMeterReading,
} from '@/services/inspection.service'
import { getErrorMessage } from '@/services/api'
import type { MeterReading } from '@/types'

const METER_PRESETS = [
  { type: 'ELECTRICITY' as const, label: 'Electricity', unit: 'kWh' },
  { type: 'WATER' as const, label: 'Water', unit: 'L' },
  { type: 'GAS' as const, label: 'Gas', unit: 'm³' },
]

type MeterReadingStepProps = {
  inspectionId: string
  meters: MeterReading[]
  disabled?: boolean
  onChange: () => void
}

export function MeterReadingStep({
  inspectionId,
  meters,
  disabled,
  onChange,
}: MeterReadingStepProps) {
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    type: 'ELECTRICITY' as MeterReading['type'],
    customTypeName: '',
    reading: '',
    unit: 'kWh',
    meterNumber: '',
    notes: '',
  })

  const addPreset = async (preset: (typeof METER_PRESETS)[number]) => {
    if (meters.some((m) => m.type === preset.type)) return
    setAdding(true)
    setError('')
    try {
      await addMeterReading(inspectionId, {
        type: preset.type,
        reading: '0',
        unit: preset.unit,
      })
      onChange()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  const addCustom = async () => {
    if (!form.customTypeName.trim() || !form.reading.trim()) return
    setAdding(true)
    setError('')
    try {
      await addMeterReading(inspectionId, {
        type: 'OTHER',
        customTypeName: form.customTypeName,
        reading: form.reading,
        unit: form.unit,
        meterNumber: form.meterNumber,
        notes: form.notes,
      })
      setForm({ type: 'OTHER', customTypeName: '', reading: '', unit: '', meterNumber: '', notes: '' })
      onChange()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  const meterLabel = (meter: MeterReading) => {
    if (meter.type === 'OTHER') return meter.customTypeName || 'Other Meter'
    return meter.type.charAt(0) + meter.type.slice(1).toLowerCase()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink">Meter Readings</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Record utility meter readings at move-in. Photos are recommended.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {METER_PRESETS.map((preset) => (
          <Button
            key={preset.type}
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || adding || meters.some((m) => m.type === preset.type)}
            onClick={() => void addPreset(preset)}
          >
            <Plus className="h-4 w-4" />
            {preset.label}
          </Button>
        ))}
      </div>

      {meters.length === 0 ? (
        <p className="text-sm text-ink-muted">No meters added yet. Use the buttons above to add readings.</p>
      ) : (
        <div className="space-y-4">
          {meters.map((meter) => (
            <MeterCard
              key={meter.id}
              meter={meter}
              label={meterLabel(meter)}
              disabled={disabled}
              onChange={onChange}
              onRemove={async () => {
                await deleteMeterReading(meter.id)
                onChange()
              }}
            />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface-muted p-4">
        <h3 className="font-semibold text-ink">Add Custom Meter</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            label="Meter Name"
            value={form.customTypeName}
            onChange={(e) => setForm((f) => ({ ...f, customTypeName: e.target.value }))}
            placeholder="Solar Meter"
          />
          <Input
            label="Reading"
            value={form.reading}
            onChange={(e) => setForm((f) => ({ ...f, reading: e.target.value }))}
            placeholder="12450"
          />
          <Input
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            placeholder="kWh"
          />
          <Input
            label="Meter Number (optional)"
            value={form.meterNumber}
            onChange={(e) => setForm((f) => ({ ...f, meterNumber: e.target.value }))}
          />
        </div>
        <Button className="mt-3" type="button" disabled={disabled || adding} onClick={() => void addCustom()}>
          Add Meter
        </Button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  )
}

function MeterCard({
  meter,
  label,
  disabled,
  onChange,
  onRemove,
}: {
  meter: MeterReading
  label: string
  disabled?: boolean
  onChange: () => void
  onRemove: () => Promise<void>
}) {
  const [reading, setReading] = useState(meter.reading)
  const [unit, setUnit] = useState(meter.unit || '')
  const [meterNumber, setMeterNumber] = useState(meter.meterNumber || '')
  const [notes, setNotes] = useState(meter.notes || '')

  const save = async (file?: File) => {
    await updateMeterReading(
      meter.id,
      { reading, unit, meterNumber, notes },
      file,
    )
    onChange()
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-ink">{label}</h3>
        {!disabled ? (
          <Button type="button" variant="tertiary" size="sm" onClick={() => void onRemove()}>
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input
          label="Reading"
          value={reading}
          onChange={(e) => setReading(e.target.value)}
          onBlur={() => void save()}
        />
        <Input label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} onBlur={() => void save()} />
        <Input
          label="Meter Number"
          value={meterNumber}
          onChange={(e) => setMeterNumber(e.target.value)}
          onBlur={() => void save()}
        />
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">Meter Photo</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.capture = 'environment'
              input.onchange = () => {
                const file = input.files?.[0]
                if (file) void save(file)
              }
              input.click()
            }}
          >
            <Camera className="h-4 w-4" />
            {meter.imageUrl ? 'Replace Photo' : 'Take Photo'}
          </Button>
        </div>
      </div>
      <Textarea
        className="mt-3"
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => void save()}
      />
      {meter.imageUrl ? (
        <img
          src={resolveInspectionImageUrl(meter.imageUrl)}
          alt={label}
          className="mt-3 h-32 w-full max-w-xs rounded-xl object-cover"
        />
      ) : null}
    </div>
  )
}
