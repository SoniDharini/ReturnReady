import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, description, children, footer, className }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated',
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-ink-secondary">{description}</p> : null}
          </div>
          <Button variant="tertiary" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
