// One bounded, chronological stream of the changes a staff member should know
// about. It is a feed, not an analytical slice of the data.

import { Link } from 'react-router-dom'
import { buildChangeFeed } from '#/features/dashboard/insights'
import type { DashboardSummary } from '#/features/dashboard/types'
import { cn, formatDate } from '#/lib/utils'

interface ChangeFeedProps {
  summary?: DashboardSummary
  isLoading: boolean
  isError: boolean
}

export function ChangeFeed({ summary, isLoading, isError }: ChangeFeedProps) {
  const events = buildChangeFeed(summary)

  return (
    <section
      aria-label="Change feed"
      className="h-full rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-compact font-semibold text-foreground">Change feed</h2>
        <span className="text-meta text-muted-foreground">Latest overlaps and escalations</span>
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading change feed">
          {['a', 'b', 'c'].map((row) => (
            <div key={row} className="h-10 rounded-lg bg-muted/60" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-3 text-compact text-danger">Unable to load recent changes.</p>
      ) : events.length === 0 ? (
        <p className="mt-3 text-meta text-muted-foreground">No recent changes.</p>
      ) : (
        <ol className="mt-3 space-y-1.5 border-l border-border pl-4">
          {events.map((event) => (
            <li key={`${event.type}-${event.id}`} className="relative">
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -left-[21px] top-2 h-2 w-2 rounded-full',
                  event.type === 'escalation' ? 'bg-danger' : 'bg-info',
                )}
              />
              <Link
                to={event.to}
                className="group flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-compact font-medium text-foreground">
                    {event.title}
                  </span>
                  <span className="block truncate text-meta text-muted-foreground">
                    {event.detail}
                  </span>
                </span>
                <span className="text-meta tabular-nums text-muted-foreground">
                  {formatDate(event.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
