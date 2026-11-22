// Report table sub-trees shared by the reporting sections. Presentational
// only; the page owns data loading and filtering.

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { TableScroll } from '#/components/ui/table-scroll'
import type { ReportGroupRow } from '#/features/reports/api'

const CELL = 'px-4 py-3 text-sm'
const HEAD_CELL = `${CELL} bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground`
const ROW =
  'border-b border-border transition-colors duration-fast ease-out last:border-0 hover:bg-muted/40'

export function CountTable({
  title,
  rows,
  labelKey,
}: {
  title: string
  rows: Array<{ count: number } & Record<string, string | number>>
  labelKey: string
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          <TableScroll label={title} className="min-w-0">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className={HEAD_CELL}>Name</th>
                  <th className={HEAD_CELL}>Cases</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row[labelKey])} className={ROW}>
                    <td className={CELL}>{String(row[labelKey])}</td>
                    <td className={CELL}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </CardContent>
    </Card>
  )
}

export function GroupTable({ title, rows }: { title: string; rows: ReportGroupRow[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          <TableScroll label={title} className="min-w-0">
            <table className="w-full min-w-[360px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className={HEAD_CELL}>Name</th>
                  <th className={HEAD_CELL}>Total</th>
                  <th className={HEAD_CELL}>Open</th>
                  <th className={HEAD_CELL}>Disposed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name} className={ROW}>
                    <td className={CELL}>{row.name}</td>
                    <td className={CELL}>{row.total}</td>
                    <td className={CELL}>{row.open}</td>
                    <td className={CELL}>{row.disposed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </CardContent>
    </Card>
  )
}
