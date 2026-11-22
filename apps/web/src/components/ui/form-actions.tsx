import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

interface FormActionsProps {
  children: ReactNode
  className?: string
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 mt-2 flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border bg-background/95 px-3 py-3 shadow-card backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  )
}
