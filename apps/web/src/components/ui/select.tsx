import type { SelectHTMLAttributes } from 'react'
import { cn } from '#/lib/utils'

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
