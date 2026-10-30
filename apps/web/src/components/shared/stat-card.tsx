import type { ReactNode } from 'react'
import { Card, CardContent } from '#/components/ui/card'
import { cn } from '#/lib/utils'

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  isLoading = false,
  className,
}: {
  label: string
  value: string | number
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  isLoading?: boolean
  className?: string
}) {
  const toneClass = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success-soft text-success-soft-foreground',
    warning: 'bg-warning-soft text-warning-soft-foreground',
    danger: 'bg-danger-soft text-danger-soft-foreground',
    info: 'bg-info-soft text-info-soft-foreground',
  }[tone]

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="flex items-start justify-between gap-3 pt-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {isLoading ? '—' : value}
          </p>
          {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        {icon ? (
          <span
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              toneClass,
            )}
          >
            {icon}
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}
