// Where attention is concentrated right now. A compact ranking, not the
// institution workload table or the map from Reports.

import { buildPressurePoints } from '#/features/dashboard/insights'
import type { DashboardSummary } from '#/features/dashboard/types'

export function PressurePoints({ summary }: { summary?: DashboardSummary }) {
  const points = buildPressurePoints(summary)

  return (
    <section
      aria-label="Pressure points"
      className="h-full rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-compact font-semibold text-foreground">Pressure points</h2>
        <span className="text-meta text-muted-foreground">Top institutions</span>
      </div>

      {points.length === 0 ? (
        <p className="mt-3 text-meta text-muted-foreground">No institution data.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {points.map((point) => (
            <li key={point.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-compact font-medium text-foreground">
                  {point.label}
                </span>
                <span className="shrink-0 text-meta tabular-nums text-muted-foreground">
                  {point.open} open
                  {point.beyond > 0 ? ` · ${point.beyond} late` : ''}
                </span>
              </div>
              <div
                aria-hidden="true"
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${point.share}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
