import type { ReactNode } from 'react'

export interface SectionHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  as?: 'h2' | 'h3'
}

export function SectionHeader({ title, description, actions, as = 'h2' }: SectionHeaderProps) {
  const Heading = as
  return (
    <div className="flex flex-wrap items-end justify-between gap-control">
      <div className="min-w-0 space-y-tight">
        <Heading className="text-subhead font-semibold text-foreground">{title}</Heading>
        {description ? <p className="text-compact text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-tight">{actions}</div> : null}
    </div>
  )
}
