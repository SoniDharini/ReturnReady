import { cn } from '@/lib/utils'
import type { SelectHTMLAttributes } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const selectId = id || props.name

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label ? <span className="font-semibold text-ink">{label}</span> : null}
      <select
        id={selectId}
        className={cn(
          'h-11 rounded-xl border border-border bg-white px-3.5 text-ink transition-colors',
          'hover:border-border-strong focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100',
          error && 'border-danger',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </label>
  )
}
