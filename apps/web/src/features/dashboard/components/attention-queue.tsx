// Primary dashboard surface: the role's scoped work queue. Presentational only;
// the page owns data loading.

import { Link } from 'react-router-dom'
import { EmptyState } from '#/components/shared/empty-state'
import { Badge } from '#/components/ui/badge'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import type { CaseListItem } from '#/features/cases/api'
import type { RoleLanding } from '#/features/dashboard/types'
import { CaseStatusBadge } from '#/features/overlaps/components/status-badges'
import { formatDateOnly } from '#/lib/utils'

interface AttentionQueueProps {
  landing: RoleLanding
  queue: {
    isLoading: boolean
    isError: boolean
    data?: { items: CaseListItem[]; total?: number }
  }
}

export function AttentionQueue({ landing, queue }: AttentionQueueProps) {
  const waiting = queue.data?.total ?? queue.data?.items.length

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-wrap items-start justify-between gap-control">
        <div className="min-w-0 space-y-tight">
          <CardTitle className="text-subhead">{landing.queueTitle}</CardTitle>
          <CardDescription>{landing.summary}</CardDescription>
        </div>
        {typeof waiting === 'number' && waiting > 0 ? (
          <Badge variant="warning">{waiting} waiting</Badge>
        ) : null}
      </CardHeader>
      <CardBody className="space-y-tight border-t border-border pt-control">
        {queue.isLoading ? (
          <div className="space-y-tight" aria-busy="true" aria-label="Loading work queue">
            {['a', 'b', 'c'].map((row) => (
              <Skeleton key={row} className="h-14 w-full" />
            ))}
          </div>
        ) : null}
        {queue.isError ? (
          <p className="text-compact text-danger">Unable to load the work queue for your role.</p>
        ) : null}
        {queue.data && queue.data.items.length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent"
            title={landing.emptyTitle}
            description={landing.emptyDescription}
          />
        ) : null}
        {queue.data?.items.map((item) => (
          <Link
            key={item.id}
            to={`/cases/${item.id}`}
            className="flex flex-wrap items-center justify-between gap-tight rounded-lg border border-border-subtle p-control transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="font-medium">{item.caseNumber}</p>
              <p className="truncate text-meta text-muted-foreground">
                {item.subject ?? item.institutionName ?? 'Complaint'}
                {item.bureauName ? ` · ${item.bureauName}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-tight">
              <CaseStatusBadge status={item.status} />
              {item.nextActionDueAt ? (
                <span className="text-meta text-muted-foreground">
                  Due {formatDateOnly(item.nextActionDueAt)}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </CardBody>
    </Card>
  )
}
