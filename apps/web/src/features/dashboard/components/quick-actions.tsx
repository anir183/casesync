// Secondary dashboard surface: quiet, role-relevant follow-up links. The one
// dominant CTA lives in the page header, so this card stays deliberately calm.

import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardBody } from '#/components/ui/card'
import type { DashboardAction } from '#/features/dashboard/types'

interface QuickActionsProps {
  actions: DashboardAction[]
  summary?: string
}

export function QuickActions({ actions, summary }: QuickActionsProps) {
  const secondaryActions = actions.filter((action) => !action.primary)

  return (
    <Card className="h-full">
      <CardBody className="space-y-control">
        {summary ? <p className="text-meta text-muted-foreground">{summary}</p> : null}
        {secondaryActions.length === 0 ? (
          <p className="text-meta text-muted-foreground">No follow-up links for this role.</p>
        ) : (
          <div className="space-y-tight">
            {secondaryActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex min-h-11 items-start justify-between gap-control rounded-lg px-2 py-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0 space-y-tight">
                  <span className="block text-compact font-medium text-foreground">
                    {action.label}
                  </span>
                  {action.description ? (
                    <span className="block text-meta text-muted-foreground">
                      {action.description}
                    </span>
                  ) : null}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
                />
              </Link>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
