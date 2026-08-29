import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { ConditionSelector } from '@/components/inspections/ConditionSelector'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import {
  deleteEvidence,
  resolveInspectionImageUrl,
  updateInspectionItem,
  uploadItemEvidence,
} from '@/services/inspection.service'
import { getErrorMessage } from '@/services/api'
import type { InspectionCondition, InspectionEvidence, InspectionItem } from '@/types'

type BaselineItem = {
  condition?: InspectionCondition | null
  notes?: string
  issueDescription?: string
  evidence?: InspectionEvidence[]
}

type InspectionItemCardProps = {
  item: InspectionItem
  evidence: InspectionEvidence[]
  baseline?: BaselineItem | null
  disabled?: boolean
  onUpdated: (item: InspectionItem) => void
  onEvidenceChange: () => void
}

export function InspectionItemCard({
  item,
  evidence,
  baseline,
  disabled,
  onUpdated,
  onEvidenceChange,
}: InspectionItemCardProps) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState(item.notes || '')
  const [issueDescription, setIssueDescription] = useState(item.issueDescription || '')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const needsIssue =
    item.condition === 'FAIR' || item.condition === 'DAMAGED' || item.condition === 'MISSING'

  const saveItem = async (updates: {
    condition?: InspectionCondition
    notes?: string
    issueDescription?: string
  }) => {
    setSaving(true)
    setError('')
    try {
      const updated = await updateInspectionItem(item.id, updates)
      onUpdated(updated)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    setError('')
    try {
      for (const file of Array.from(files)) {
        await uploadItemEvidence(item.id, file)
      }
      onEvidenceChange()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to upload photo'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-ink">{item.itemName}</h3>
          <p className="text-xs text-ink-muted capitalize">
            {item.itemType === 'ROOM' ? 'Room condition' : 'Inventory item'}
          </p>
        </div>
        {item.isCompleted ? (
          <span className="rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">
            Done
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-4">
        {baseline ? (
          <div className="rounded-xl border border-border bg-surface-muted/60 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Move-In Condition</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {baseline.condition?.replaceAll('_', ' ') || 'Not recorded'}
            </p>
            {baseline.issueDescription || baseline.notes ? (
              <p className="mt-1 text-sm text-ink-secondary">
                {baseline.issueDescription || baseline.notes}
              </p>
            ) : null}
            {baseline.evidence && baseline.evidence.length > 0 ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {baseline.evidence.map((photo) => (
                  <img
                    key={photo.id}
                    src={resolveInspectionImageUrl(photo.imageUrl)}
                    alt={photo.caption || 'Move-in photo'}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">
            {baseline ? 'Current Move-Out Condition' : 'Condition'}
          </p>
          <ConditionSelector
            value={item.condition}
            disabled={disabled || saving}
            onChange={(condition) => void saveItem({ condition, notes, issueDescription })}
          />
        </div>

        {needsIssue ? (
          <Textarea
            label="Describe the issue"
            value={issueDescription}
            placeholder={
              item.condition === 'MISSING'
                ? 'Expected item was not present during move-in.'
                : 'Describe the damage or issue in detail.'
            }
            onChange={(e) => setIssueDescription(e.target.value)}
            onBlur={() => {
              if (issueDescription !== (item.issueDescription || '')) {
                void saveItem({ condition: item.condition || undefined, notes, issueDescription })
              }
            }}
          />
        ) : null}

        <Textarea
          label="Notes (optional)"
          value={notes}
          placeholder="Add notes about the current condition"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== (item.notes || '')) {
              void saveItem({ condition: item.condition || undefined, notes, issueDescription })
            }
          }}
        />

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Photo Evidence</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => fileRef.current?.click()}
            >
              Upload Photos
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleUpload(e.target.files)
              e.target.value = ''
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void handleUpload(e.target.files)
              e.target.value = ''
            }}
          />

          {evidence.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {evidence.map((photo) => (
                <div key={photo.id} className="relative overflow-hidden rounded-xl border border-border">
                  <img
                    src={resolveInspectionImageUrl(photo.imageUrl)}
                    alt={photo.caption || item.itemName}
                    className="aspect-square w-full object-cover"
                  />
                  {!disabled ? (
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1.5 text-danger shadow-sm"
                      onClick={async () => {
                        try {
                          await deleteEvidence(photo.id)
                          onEvidenceChange()
                        } catch (err) {
                          setError(getErrorMessage(err))
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {saving ? <p className="mt-2 text-xs text-ink-muted">Saving...</p> : null}
      {uploading ? <p className="mt-2 text-xs text-ink-muted">Uploading...</p> : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  )
}
