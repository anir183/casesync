import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { matchTypeLabel, reviewStatusLabel } from '#/features/overlaps/labels'
import { apiClient } from '#/lib/api-client'
import { formatDate } from '#/lib/utils'

interface StatusCounts {
  total: number
  open: number
  pending: number
  unassigned: number
  assigned: number
  underProcess: number
  disposed: number
  transferred: number
  escalated: number
  reopened: number
  beyondTimelines: number
}

interface RecentOverlap {
  id: string
  matchType: string
  reviewStatus: string
  createdAt: string
  institutionName: string
  caseNumbers: string[]
}

interface RecentEscalation {
  id: string
  caseId: string
  caseNumber: string
  remarks?: string
  createdAt: string
}

interface DashboardSummary extends StatusCounts {
  generatedAt: string
  institutionWise: Array<StatusCounts & { institutionId: string; institutionName: string }>
  bureauWise: Array<StatusCounts & { bureauId: string; bureauName: string; bureauCode: string }>
  regionWise: Array<StatusCounts & { regionId: string; regionName: string; regionCode: string }>
  recentOverlaps: RecentOverlap[]
  recentEscalations: RecentEscalation[]
}

interface DashboardFilters {
  dateFrom?: string
  dateTo?: string
}

const TILES: Array<{ key: keyof StatusCounts; label: string }> = [
  { key: 'total', label: 'Total cases' },
  { key: 'open', label: 'Open cases' },
  { key: 'pending', label: 'Pending' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'underProcess', label: 'Under process' },
  { key: 'disposed', label: 'Disposed' },
  { key: 'transferred', label: 'Transferred' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'reopened', label: 'Reopened' },
  { key: 'unassigned', label: 'Unassigned' },
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
  regionId?: string
  regionName?: string
  regionCode?: string
}

function WorkloadTable({
  title,
  rows,
  labelKey,
}: {
  title: string
  rows: WorkloadRow[]
  labelKey: 'institutionName' | 'bureauName' | 'regionName'
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

function buildQuery(filters: DashboardFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function DashboardPage() {
  const [draft, setDraft] = useState<DashboardFilters>({})
  const [filters, setFilters] = useState<DashboardFilters>({})
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'summary', filters],
    queryFn: () => apiClient.get<DashboardSummary>(`/dashboard/summary${buildQuery(filters)}`),
    refetchInterval: 30_000,
  })

  const institutionRows = data?.institutionWise ?? []
  const bureauRows =
    data?.bureauWise.map((item) => ({
      ...item,
      bureauName: `${item.bureauName} (${item.bureauCode})`,
    })) ?? []
  const regionRows =
    data?.regionWise.map((item) => ({
      ...item,
      regionName: `${item.regionName} (${item.regionCode})`,
    })) ?? []

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFilters({
      dateFrom: draft.dateFrom || undefined,
      dateTo: draft.dateTo || undefined,
    })
  }

  function handleReset() {
    setDraft({})
    setFilters({})
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Institution complaint overview across Bureaus, Cells and regions.
          </p>
        </div>
        {data && (
          <p className="text-xs text-muted-foreground">
            Updated {formatDate(data.generatedAt)} · refreshes every 30s
          </p>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="dashboard-from">
                Received from
              </label>
              <Input
                id="dashboard-from"
                type="date"
                value={draft.dateFrom ?? ''}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, dateFrom: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="dashboard-to">
                Received to
              </label>
              <Input
                id="dashboard-to"
                type="date"
                value={draft.dateTo ?? ''}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, dateTo: event.target.value }))
                }
              />
            </div>
            <Button type="submit" size="sm">
              Apply
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </form>
        </CardContent>
      </Card>

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
        <WorkloadTable title="Region-wise workload" rows={regionRows} labelKey="regionName" />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent overlaps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data?.recentOverlaps.length && (
              <p className="text-sm text-muted-foreground">No recent overlaps.</p>
            )}
            {data?.recentOverlaps.map((item) => (
              <div key={item.id} className="space-y-1 border-b border-border pb-2 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/overlaps/${item.id}`} className="text-sm font-medium underline">
                    {item.caseNumbers.join(' ↔ ') || 'Overlap relationship'}
                  </Link>
                  <Badge variant={item.reviewStatus === 'PENDING' ? 'warning' : 'muted'}>
                    {reviewStatusLabel(item.reviewStatus)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.institutionName} · {matchTypeLabel(item.matchType)} ·{' '}
                  {formatDate(item.createdAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent escalations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data?.recentEscalations.length && (
              <p className="text-sm text-muted-foreground">No recent escalations.</p>
            )}
            {data?.recentEscalations.map((item) => (
              <div key={item.id} className="space-y-1 border-b border-border pb-2 last:border-0">
                <Link to={`/cases/${item.caseId}`} className="text-sm font-medium underline">
                  {item.caseNumber}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {item.remarks || 'Escalated'} · {formatDate(item.createdAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
