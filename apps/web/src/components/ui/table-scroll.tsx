import type { HTMLAttributes } from 'react'
import { cn } from '#/lib/utils'

export function TableScroll({
  label,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { label: string }) {
  return (
    <section
      aria-label={label}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard focusable
      tabIndex={0}
      className={cn(
        'overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}
