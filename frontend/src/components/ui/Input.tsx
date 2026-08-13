import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id || props.name

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label ? <span className="font-semibold text-ink">{label}</span> : null}
      <input
        id={inputId}
        className={cn(
          'h-11 rounded-xl border border-border bg-white px-3.5 text-ink placeholder:text-ink-muted transition-colors',
          'hover:border-border-strong focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100',
          error && 'border-danger focus:border-danger focus:ring-red-100',
          className,
        )}
        {...props}
      />
      {error ? <span className="text-sm text-danger">{error}</span> : null}
      {!error && hint ? <span className="text-sm text-ink-muted">{hint}</span> : null}
    </label>
  )
}
