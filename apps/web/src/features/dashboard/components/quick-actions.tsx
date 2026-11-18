// Secondary dashboard surface: the small set of role-appropriate next steps.

import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardBody } from '#/components/ui/card'
import type { DashboardAction } from '#/features/dashboard/types'
import { cn } from '#/lib/utils'

export function QuickActions({ actions }: { actions: DashboardAction[] }) {
  return (
    <Card className="h-full">
      <CardBody className="space-y-control">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={cn(
              'group flex w-full items-start justify-between gap-control rounded-lg border p-control transition-colors',
              action.primary
                ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                : 'border-border-subtle hover:bg-muted/40',
            )}
          >
            <span className="min-w-0 space-y-tight">
              <span className="block text-compact font-medium text-foreground">{action.label}</span>
              {action.description ? (
                <span className="block text-meta text-muted-foreground">{action.description}</span>
              ) : null}
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
            />
          </Link>
        ))}
      </CardBody>
    </Card>
  )
}
