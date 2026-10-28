import { useQuery } from '@tanstack/react-query'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { apiClient } from '#/lib/api-client'

interface StatusCounts {
  total: number
  open: number
  pending: number
  underProcess: number
  disposed: number
  transferred: number
  escalated: number
  reopened: number
  beyondTimelines: number
}

interface DashboardSummary extends StatusCounts {
  institutionWise: Array<StatusCounts & { institutionId: string; institutionName: string }>
  bureauWise: Array<StatusCounts & { bureauId: string; bureauName: string; bureauCode: string }>
}

const TILES: Array<{ key: keyof StatusCounts; label: string }> = [
  { key: 'total', label: 'Total cases' },
  { key: 'open', label: 'Open cases' },
  { key: 'pending', label: 'Pending' },
  { key: 'underProcess', label: 'Under process' },
  { key: 'disposed', label: 'Disposed' },
  { key: 'transferred', label: 'Transferred' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'beyondTimelines', label: 'Beyond timeline' },
]

const CELL = 'px-3 py-2 text-sm'
const HEAD_CELL = `${CELL} text-xs uppercase tracking-wide text-muted-foreground`

interface WorkloadRow extends StatusCounts {
  institutionId?: string
  institutionName?: string
  bureauId?: string
  bureauName?: string
  bureauCode?: string
}

function WorkloadTable({
  title,
  rows,
  labelKey,
}: {
  title: string
  rows: WorkloadRow[]
  labelKey: 'institutionName' | 'bureauName'
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
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
                  <tr key={String(row[labelKey])} className="border-b border-border last:border-0">
                    <td className={CELL}>{String(row[labelKey])}</td>
                    <td className={CELL}>{row.total}</td>
                    <td className={CELL}>{row.open}</td>
                    <td className={CELL}>{row.disposed}</td>
                    <td className={CELL}>
                      {row.beyondTimelines > 0 ? (
                        <Badge variant="danger">{row.beyondTimelines}</Badge>
                      ) : (
                        0
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiClient.get<DashboardSummary>('/dashboard/summary'),
  })

  const institutionRows = data?.institutionWise ?? []
  const bureauRows =
    data?.bureauWise.map((item) => ({
      ...item,
      bureauName: `${item.bureauName} (${item.bureauCode})`,
    })) ?? []

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Institution complaint overview across Bureaus and Cells.
        </p>
      </div>

      {isError && <p className="text-sm text-red-600">Unable to load dashboard summary.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((tile) => (
          <Card key={tile.key}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {tile.label}
              </CardTitle>
              {tile.key === 'beyondTimelines' && data?.[tile.key] ? (
                <Badge variant="danger">Attention</Badge>
              ) : null}
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{isLoading ? '—' : (data?.[tile.key] ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkloadTable
          title="Institution-wise status"
          rows={institutionRows}
          labelKey="institutionName"
        />
        <WorkloadTable title="Bureau/Cell-wise workload" rows={bureauRows} labelKey="bureauName" />
      </div>
    </div>
  )
}
