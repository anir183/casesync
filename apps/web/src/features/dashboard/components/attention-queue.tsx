// Primary dashboard surface: a bounded, urgency-ordered work queue. The page
// owns data loading and the session-local change baseline.

import { AlertTriangle, ArrowUpRight, Clock3, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '#/components/shared/empty-state'
import { Skeleton } from '#/components/ui/skeleton'
import type { CaseListItem } from '#/features/cases/api'
import {
  ATTENTION_BANDS,
  ATTENTION_BAND_LABELS,
  type AttentionBand,
  type AttentionEntry,
  deriveAttention,
} from '#/features/dashboard/attention'
import { DashboardBadge } from '#/features/dashboard/components/dashboard-badge'
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

type BandMeta = { accent: string; text: string; icon: typeof AlertTriangle }

const BAND_META: Record<AttentionBand, BandMeta> = {
  'due-now': { accent: 'bg-danger', text: 'text-danger', icon: AlertTriangle },
  'due-soon': { accent: 'bg-warning', text: 'text-warning', icon: Clock3 },
  watching: { accent: 'bg-muted-foreground/50', text: 'text-muted-foreground', icon: Eye },
}

export function AttentionQueue({ landing, queue, newIds, now }: AttentionQueueProps) {
  const items = queue.data?.items ?? []
  const waiting = queue.data?.total ?? items.length
  const entries = deriveAttention(items, now, newIds)
  const viewAllTo = landing.queueFilters
    ? `/cases${buildQuery({ ...landing.queueFilters, pageSize: undefined })}`
    : '/cases'
  const groups = ATTENTION_BANDS.map((band) => ({
    band,
    entries: entries.filter((entry) => entry.band === band),
  })).filter((group) => group.entries.length > 0)
  const showBandHeadings = groups.length > 1

  const renderRow = ({ item, countdown, dueAt, reason, isNew }: AttentionEntry, meta: BandMeta) => (
    <Link
      key={item.id}
      to={`/cases/${item.id}`}
      className="group flex min-h-14 items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-border-subtle hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden="true" className={cn('h-8 w-1 shrink-0 rounded-full', meta.accent)} />
      <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-compact font-semibold tabular-nums text-foreground">
              {item.caseNumber}
            </span>
            {isNew ? <DashboardBadge variant="info">New</DashboardBadge> : null}
          </span>
          <span className="block truncate text-meta text-muted-foreground">
            {item.subject ?? item.institutionName ?? 'Complaint'}
            {item.bureauName ? ` · ${item.bureauName}` : ''}
            {dueAt ? ` · ${formatDateOnly(dueAt)}` : ''}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-meta sm:flex-col sm:items-end sm:gap-0.5">
          <span className="max-w-[9rem] truncate text-muted-foreground">{reason}</span>
          <span
            className={cn(
              'font-medium tabular-nums',
              countdown.includes('overdue') || countdown === 'Due now' ? 'text-danger' : meta.text,
            )}
          >
            {countdown}
          </span>
        </span>
      </span>
      <ArrowUpRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
      />
    </Link>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-subhead font-semibold tracking-tight text-foreground">
            {landing.queueTitle}
          </h2>
          <p className="text-meta text-muted-foreground">{landing.summary}</p>
        </div>
        {waiting > 0 ? <DashboardBadge variant="warning">{waiting} waiting</DashboardBadge> : null}
      </div>

      <section
        aria-label={`${landing.queueTitle} rows`}
        className="min-h-0 max-h-[22rem] flex-1 overflow-y-auto p-2"
      >
        {queue.isLoading ? (
          <div className="space-y-2 p-2" aria-busy="true" aria-label="Loading work queue">
            {['a', 'b', 'c'].map((row) => (
              <Skeleton key={row} className="h-12 w-full" />
            ))}
          </div>
        ) : null}
        {queue.isError ? (
          <p className="p-2 text-compact text-danger">
            Unable to load the work queue for your role.
          </p>
        ) : null}
        {queue.data && items.length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent"
            title={landing.emptyTitle}
            description={landing.emptyDescription}
          />
        ) : null}

        {groups.map(({ band, entries: bandEntries }) => {
          const meta = BAND_META[band]
          const BandIcon = meta.icon

          return (
            <div key={band} className={showBandHeadings ? 'mb-3 last:mb-0' : ''}>
              {showBandHeadings ? (
                <div className="flex items-center gap-2 px-2 pb-1.5">
                  <BandIcon aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-meta font-semibold uppercase tracking-wide text-foreground">
                    {ATTENTION_BAND_LABELS[band]}
                  </h3>
                  <span className="text-meta tabular-nums text-muted-foreground">
                    {bandEntries.length}
                  </span>
                </div>
              ) : null}
              <div className="space-y-1.5">
                {bandEntries.map((entry) => renderRow(entry, meta))}
              </div>
            </div>
          )
        })}
      </section>

      {typeof waiting === 'number' && waiting > items.length ? (
        <Link
          to={viewAllTo}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 border-t border-border px-4 text-compact font-medium text-primary transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View all {waiting}
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  )
}
