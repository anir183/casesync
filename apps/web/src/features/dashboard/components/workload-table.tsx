// Shared workload table used by the institution, bureau, and region sections
// of the dashboard.

import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { StatusCounts } from '#/features/dashboard/types'

const CELL = 'px-4 py-3 text-sm'
const HEAD_CELL = `${CELL} bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground`

export function WorkloadTable<T extends StatusCounts>({
  title,
  rows,
  labelKey,
}: {
  title: string
  rows: T[]
  labelKey: keyof T & string
}) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data for this period.</p>
        ) : (
          <section
            // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard focusable
            tabIndex={0}
            aria-label={`${title} table`}
            className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <table className="w-full min-w-[460px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className={HEAD_CELL}>Name</th>
                  <th className={HEAD_CELL}>Total</th>
                  <th className={HEAD_CELL}>Open</th>
                  <th className={HEAD_CELL}>Disposed</th>
                  <th className={HEAD_CELL}>Beyond SLA</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={String(row[labelKey])}
                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className={CELL}>
                      <div className="font-medium">{String(row[labelKey])}</div>
                      {'bureauCode' in row && row.bureauCode !== '—' ? (
                        <span className="text-xs text-muted-foreground">
                          {String(row.bureauCode)}
                        </span>
                      ) : null}
                    </td>
                    <td className={CELL}>{row.total}</td>
                    <td className={CELL}>{row.open}</td>
                    <td className={CELL}>{row.disposed}</td>
                    <td className={CELL}>
                      {row.beyondTimelines > 0 ? (
                        <Badge variant="danger">{row.beyondTimelines}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
