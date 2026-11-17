import { cloneElement, useId, useState } from 'react'
import type { ReactElement } from 'react'
import { cn } from '#/lib/utils'

export interface TooltipProps {
  label: string
  children: ReactElement
  side?: 'top' | 'bottom'
}

export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const tooltipId = useId()
  const existingDescribedBy = (children.props as { 'aria-describedby'?: unknown })[
    'aria-describedby'
  ]
  const describedBy = [
    typeof existingDescribedBy === 'string' ? existingDescribedBy : null,
    visible ? tooltipId : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {cloneElement(children as ReactElement<Record<string, unknown>>, {
        'aria-describedby': describedBy || undefined,
      })}
      {visible ? (
        <div
          role="tooltip"
          id={tooltipId}
          className={cn(
            'pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-meta text-background shadow-lg',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {label}
        </div>
      ) : null}
    </span>
  )
}
