// Role-specific landing card: heading, copy, quick links, and the scoped work
// queue. Presentational only; the page owns data loading.

import { Link } from 'react-router-dom'
import { EmptyState } from '#/components/shared/empty-state'
import { buttonVariants } from '#/components/ui/button'
import { Card, CardBody } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import type { CaseListItem } from '#/features/cases/api'
import type { RoleLanding } from '#/features/dashboard/types'
import { CaseStatusBadge } from '#/features/overlaps/components/status-badges'
import { formatDateOnly } from '#/lib/utils'

interface RoleLandingCardProps {
  landing: RoleLanding
  queue: {
    isLoading: boolean
    isError: boolean
    data?: { items: CaseListItem[] }
  }
}

export function RoleLandingCard({ landing, queue }: RoleLandingCardProps) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {landing.kicker}
            </p>
            <h2 className="text-lg font-semibold">{landing.queueTitle}</h2>
            <p className="text-sm text-muted-foreground">{landing.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {landing.links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {landing.queueFilters ? (
          <div className="space-y-2 border-t border-border pt-3">
            {queue.isLoading && (
              <div className="space-y-2" aria-busy="true" aria-label="Loading role work queue">
                {['a', 'b', 'c'].map((row) => (
                  <Skeleton key={row} className="h-14 w-full" />
                ))}
              </div>
            )}
            {queue.isError && (
              <p className="text-sm text-danger">Unable to load the work queue for your role.</p>
            )}
            {queue.data && queue.data.items.length === 0 && (
              <EmptyState
                className="border-0 bg-transparent"
                title={landing.emptyTitle}
                description={landing.emptyDescription}
              />
            )}
            {queue.data?.items.map((item) => (
              <Link
                key={item.id}
                to={`/cases/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">{item.caseNumber}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.subject ?? item.institutionName ?? 'Complaint'}
                    {item.bureauName ? ` · ${item.bureauName}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <CaseStatusBadge status={item.status} />
                  {item.nextActionDueAt ? (
                    <span className="text-xs text-muted-foreground">
                      Due {formatDateOnly(item.nextActionDueAt)}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            className="border-0 bg-transparent"
            title={landing.emptyTitle}
            description={landing.emptyDescription}
          />
        )}
      </CardBody>
    </Card>
  )
}
