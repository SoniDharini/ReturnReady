import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({
  children,
  className,
  interactive,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-white p-5 shadow-card',
        interactive && 'transition-shadow hover:shadow-elevated',
        className,
      )}
    >
      {children}
    </div>
  )
}
