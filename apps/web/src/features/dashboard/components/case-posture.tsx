// Snapshot of the current status mix. It answers "where do things stand?" in
// one glance without becoming an analytical chart.

import { buildPosture } from '#/features/dashboard/insights'
import type { DashboardSummary } from '#/features/dashboard/types'
import { cn } from '#/lib/utils'

export function CasePosture({ summary }: { summary?: DashboardSummary }) {
  const segments = buildPosture(summary)
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const description = segments.length
    ? segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')
    : 'No case status data'

  return (
    <section aria-label="Case posture" className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-compact font-semibold text-foreground">Case posture</h2>
        <span className="text-meta tabular-nums text-muted-foreground">{total} cases</span>
      </div>

      {segments.length === 0 ? (
        <p className="mt-3 text-meta text-muted-foreground">No case status data.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={description}
            className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
          >
            {segments.map((segment) => (
              <span
                key={segment.key}
                className={cn('h-full', segment.barClass)}
                style={{ width: `${(segment.value / total) * 100}%` }}
              />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {segments.map((segment) => (
              <li key={segment.key} className="flex min-w-0 items-center gap-1.5 text-meta">
                <span
                  aria-hidden="true"
                  className={cn('h-1.5 w-1.5 shrink-0 rounded-full', segment.dotClass)}
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {segment.label}
                </span>
                <span className="tabular-nums text-foreground">{segment.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
