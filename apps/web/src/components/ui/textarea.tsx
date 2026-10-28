import type { LabelHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '#/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20',
        className,
      )}
      {...props}
    />
  )
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is supplied by the caller
    <label className={cn('text-sm font-medium', className)} {...props} />
  )
}
