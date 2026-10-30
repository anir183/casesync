import type { ReactNode } from 'react'
import { Card, CardContent } from '#/components/ui/card'
import { cn } from '#/lib/utils'

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('border-dashed bg-card/60', className)}>
      <CardContent className="flex flex-col items-start gap-3 py-8">
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </CardContent>
    </Card>
  )
}
