// Primary dashboard surface: the role's scoped work queue. Presentational only;
// the page owns data loading and the session-local change baseline.

import { CASE_STATUS } from '@casesync/config'
import { AlertTriangle, ArrowUpRight, Clock3, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '#/components/shared/empty-state'
import { Badge } from '#/components/ui/badge'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import type { CaseListItem } from '#/features/cases/api'
import {
  ATTENTION_BANDS,
  ATTENTION_BAND_LABELS,
  type AttentionBand,
  deriveAttention,
} from '#/features/dashboard/attention'
import type { RoleLanding } from '#/features/dashboard/types'
import { buildQuery, cn, formatDateOnly } from '#/lib/utils'

interface AttentionQueueProps {
  landing: RoleLanding
  queue: {
    isLoading: boolean
    isError: boolean
    data?: { items: CaseListItem[]; total?: number }
  }
  newIds?: ReadonlySet<string>
  now?: number
}

const BAND_META: Record<
  AttentionBand,
  { badge: 'danger' | 'warning' | 'muted'; accent: string; icon: typeof AlertTriangle }
> = {
  'due-now': { badge: 'danger', accent: 'border-l-danger', icon: AlertTriangle },
  'due-soon': { badge: 'warning', accent: 'border-l-warning', icon: Clock3 },
  watching: { badge: 'muted', accent: 'border-l-border', icon: Eye },
}

function reasonVariant(status: string): 'danger' | 'warning' | 'primary' | 'muted' {
  if (status === CASE_STATUS.ESCALATED || status === CASE_STATUS.REOPENED) return 'danger'
  if (status === CASE_STATUS.AWAITING_COMPLAINANT || status === CASE_STATUS.TRANSFERRED)
    return 'warning'
  if (status === CASE_STATUS.ASSIGNED) return 'primary'
  return 'muted'
}

export function AttentionQueue({ landing, queue, newIds, now }: AttentionQueueProps) {
  const items = queue.data?.items ?? []
  const waiting = queue.data?.total ?? items.length
  const entries = deriveAttention(items, now, newIds)
  const viewAllTo = landing.queueFilters ? `/cases${buildQuery(landing.queueFilters)}` : '/cases'

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
      <CardBody className="space-y-control border-t border-border pt-control">
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
        {queue.data && items.length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent"
            title={landing.emptyTitle}
            description={landing.emptyDescription}
          />
        ) : null}

        {ATTENTION_BANDS.map((band) => {
          const bandEntries = entries.filter((entry) => entry.band === band)
          if (bandEntries.length === 0) return null
          const meta = BAND_META[band]
          const BandIcon = meta.icon

          return (
            <div key={band} className="space-y-tight">
              <div className="flex items-center gap-tight">
                <BandIcon aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-meta font-semibold text-foreground">
                  {ATTENTION_BAND_LABELS[band]}
                </h4>
                <span className="text-meta tabular-nums text-muted-foreground">
                  {bandEntries.length}
                </span>
              </div>
              <div className="space-y-tight">
                {bandEntries.map(({ item, band: entryBand, countdown, dueAt, reason, isNew }) => (
                  <Link
                    key={item.id}
                    to={`/cases/${item.id}`}
                    className={cn(
                      'flex min-h-11 flex-wrap items-center justify-between gap-tight rounded-lg border border-l-2 border-border-subtle p-control transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      meta.accent,
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-tight">
                        <span className="font-medium tabular-nums">{item.caseNumber}</span>
                        <Badge variant={BAND_META[entryBand].badge}>
                          {ATTENTION_BAND_LABELS[entryBand]}
                        </Badge>
                        {isNew ? <Badge variant="info">New</Badge> : null}
                      </div>
                      <p className="truncate text-meta text-muted-foreground">
                        {item.subject ?? item.institutionName ?? 'Complaint'}
                        {item.bureauName ? ` · ${item.bureauName}` : ''}
                      </p>
                      <div className="flex flex-wrap items-center gap-tight text-meta text-muted-foreground">
                        <Badge variant={reasonVariant(item.status)}>{reason}</Badge>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock3 aria-hidden="true" className="h-3 w-3" />
                          {countdown}
                        </span>
                        {dueAt ? (
                          <span className="tabular-nums">· {formatDateOnly(dueAt)}</span>
                        ) : null}
                        {item.officerName ? <span>· {item.officerName}</span> : null}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-compact font-medium text-primary">
                      Open
                      <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}

        {typeof waiting === 'number' && waiting > items.length ? (
          <Link
            to={viewAllTo}
            className="inline-flex min-h-11 items-center gap-1 text-compact font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all {waiting}
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </CardBody>
    </Card>
  )
}
