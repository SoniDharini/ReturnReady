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
          'relative z-10 flex w-full max-w-md max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-elevated',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6 pb-4">
          <div className="min-w-0 pr-2">
            <h2 id="modal-title" className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-ink-secondary">{description}</p> : null}
          </div>
          <Button type="button" variant="tertiary" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-2">
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-white px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
