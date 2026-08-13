import { cn } from '@/lib/utils'
import type { TextareaHTMLAttributes } from 'react'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const textareaId = id || props.name

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label ? <span className="font-semibold text-ink">{label}</span> : null}
      <textarea
        id={textareaId}
        className={cn(
          'min-h-28 rounded-xl border border-border bg-white px-3.5 py-3 text-ink placeholder:text-ink-muted transition-colors',
          'hover:border-border-strong focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100',
          error && 'border-danger focus:border-danger focus:ring-red-100',
          className,
        )}
        {...props}
      />
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </label>
  )
}
