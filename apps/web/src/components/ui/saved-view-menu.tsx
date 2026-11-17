import { useId } from 'react'
import type { ChangeEvent } from 'react'
import { cn } from '#/lib/utils'

export interface SavedViewMenuProps {
  views: { id: string; label: string }[]
  value?: string
  onChange: (id: string) => void
  ariaLabel?: string
  className?: string
}

export function SavedViewMenu({
  views,
  value,
  onChange,
  ariaLabel = 'Saved views',
  className,
}: SavedViewMenuProps) {
  const selectId = useId()

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value)
  }

  return (
    <div className={cn('flex items-center gap-tight', className)}>
      <label htmlFor={selectId} className="text-meta font-medium text-muted-foreground">
        {ariaLabel}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={handleChange}
        className="h-9 rounded-lg border border-border-subtle bg-surface-card px-2 text-compact text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {views.map((view) => (
          <option key={view.id} value={view.id}>
            {view.label}
          </option>
        ))}
      </select>
    </div>
  )
}
