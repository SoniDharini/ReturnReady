import { Camera, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export type PhotoEvidence = {
  id: string
  name: string
  uploadedAt: string
  uploadedBy: string
  url?: string
}

type EvidenceUploadProps = {
  photos: PhotoEvidence[]
  onRemove?: (id: string) => void
}

export function EvidenceUpload({ photos, onRemove }: EvidenceUploadProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-muted px-6 py-10 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-card">
          <Upload className="h-5 w-5" />
        </div>
        <p className="font-semibold text-ink">Add Photos</p>
        <p className="mt-1 text-sm text-ink-secondary">Drag & drop or choose photos from your device</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="secondary" size="sm">
            <Upload className="h-4 w-4" />
            Choose Photos
          </Button>
          <Button type="button" variant="secondary" size="sm">
            <Camera className="h-4 w-4" />
            Take Photo
          </Button>
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative overflow-hidden rounded-xl border border-border bg-white">
              <div className="flex h-28 items-center justify-center bg-surface-subtle text-ink-muted">
                <Camera className="h-6 w-6" aria-hidden />
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs font-semibold text-ink">{photo.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{photo.uploadedAt}</p>
                <p className="text-xs text-ink-muted">by {photo.uploadedBy}</p>
              </div>
              {onRemove ? (
                <button
                  type="button"
                  aria-label={`Remove ${photo.name}`}
                  onClick={() => onRemove(photo.id)}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-ink-secondary shadow-sm hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
