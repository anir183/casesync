import type { FormEvent, ReactNode } from 'react'

export interface FilterBarProps {
  children?: ReactNode
  ariaLabel?: string
  actions?: ReactNode
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
}

export function FilterBar({ children, ariaLabel = 'Filters', actions, onSubmit }: FilterBarProps) {
  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: this is the explicit search landmark for filter forms */}
      <form
        role="search"
        aria-label={ariaLabel}
        onSubmit={onSubmit}
        className="flex flex-wrap items-end gap-control"
      >
        {children}
        {actions ? <div className="ml-auto flex items-center gap-tight">{actions}</div> : null}
      </form>
    </>
  )
}
