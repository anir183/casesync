import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, FolderOpen, Layers } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart } from '#/components/charts/bar-chart'
import { ChartCard } from '#/components/charts/chart-card'
import { DonutChart } from '#/components/charts/donut-chart'
import { GaugeChart } from '#/components/charts/gauge-chart'
import { TrendChart } from '#/components/charts/trend-chart'
import { EmptyState } from '#/components/shared/empty-state'
import { PageHeader } from '#/components/shared/page-header'
import { StatCard } from '#/components/shared/stat-card'
import { StatusBadge } from '#/components/shared/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { matchTypeLabel } from '#/features/overlaps/labels'
import { useReports, useReportsGeo } from '#/features/reports/api'
import { RegionMap } from '#/features/reports/components/region-map'
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

const CELL = 'px-3 py-2.5 text-sm'
const HEAD_CELL = `${CELL} text-xs font-medium uppercase tracking-wide text-muted-foreground`

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}

function buildQuery(filters: DashboardFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

function WorkloadTable<T extends StatusCounts>({
  title,
  rows,
  labelKey,
}: {
  title: string
  rows: T[]
  labelKey: keyof T & string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
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
                  <tr key={String(row[labelKey])} className="border-b border-border last:border-0">
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const [draft, setDraft] = useState<DashboardFilters>({})
  const [filters, setFilters] = useState<DashboardFilters>({})
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'summary', filters],
    queryFn: () => apiClient.get<DashboardSummary>(`/dashboard/summary${buildQuery(filters)}`),
    refetchInterval: 30_000,
  })
  const reports = useReports(filters)
  const geo = useReportsGeo(filters)

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
  const statusData = (reports.data?.byStatus ?? []).map((item) => ({
    label: titleCase(item.status),
    value: item.count,
  }))
  const overdueRate =
    data && data.total > 0 ? Math.round((data.beyondTimelines / data.total) * 100) : 0

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
      <PageHeader
        title="Dashboard"
        description="Live complaint posture across institutions, bureaus and regions."
        actions={
          data ? (
            <p className="text-xs text-muted-foreground">
              Updated {formatDate(data.generatedAt)} · refreshes every 30s
            </p>
          ) : null
        }
      />

      <Card>
        <CardContent className="pt-4">
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

      {isError && (
        <p className="text-sm text-danger-soft-foreground">Unable to load dashboard summary.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total cases"
          value={data?.total ?? 0}
          isLoading={isLoading}
          icon={<Layers className="h-4 w-4" />}
          tone="primary"
          hint={`${data?.open ?? 0} currently open`}
        />
        <StatCard
          label="Open cases"
          value={data?.open ?? 0}
          isLoading={isLoading}
          icon={<FolderOpen className="h-4 w-4" />}
          tone="info"
          hint={`${data?.unassigned ?? 0} unassigned`}
        />
        <StatCard
          label="Beyond timeline"
          value={data?.beyondTimelines ?? 0}
          isLoading={isLoading}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={data?.beyondTimelines ? 'danger' : 'success'}
          hint={`${overdueRate}% of visible cases`}
        />
        <StatCard
          label="Disposal rate"
          value={reports.data ? `${reports.data.totals.disposalRate}%` : '—'}
          isLoading={reports.isLoading}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
          hint={`${data?.disposed ?? 0} disposed`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Status mix"
          description="Current case status distribution."
          className="lg:col-span-1"
        >
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <DonutChart data={statusData} caption="Case status mix" centerLabel="Cases" />
          )}
        </ChartCard>
        <ChartCard
          title="Overdue pressure"
          description="Share of visible cases beyond their expected disposal date."
          className="lg:col-span-1"
        >
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <GaugeChart
              value={overdueRate}
              label="beyond timeline"
              caption="Overdue pressure"
              tone={overdueRate >= 25 ? 'danger' : overdueRate >= 10 ? 'warning' : 'success'}
            />
          )}
        </ChartCard>
        <ChartCard
          title="Categories"
          description="Top complaint categories in the current period."
          className="lg:col-span-1"
        >
          {reports.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <BarChart
              data={(reports.data?.byCategory ?? []).map((item) => ({
                label: titleCase(item.category),
                value: item.count,
              }))}
              caption="Cases by category"
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Received vs disposal actions"
          description="Monthly volume over the reporting window."
          className="lg:col-span-2"
        >
          {reports.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <TrendChart
              data={(reports.data?.monthly ?? []).map((item) => ({
                label: item.month,
                received: item.received,
                disposed: item.disposed,
              }))}
              caption="Monthly received versus disposal actions"
            />
          )}
        </ChartCard>
        <ChartCard
          title="Regional pressure"
          description="Bubble size is volume; colour is overdue pressure."
          className="lg:col-span-1"
        >
          {geo.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : geo.data?.regions.length ? (
            <RegionMap regions={geo.data.regions} caption="Regional case pressure" />
          ) : (
            <EmptyState title="No regional data" description="No mapped regions are in scope." />
          )}
          <div className="mt-3">
            <Link
              to="/reports"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open regional reports
            </Link>
          </div>
        </ChartCard>
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
                  <Link
                    to={`/overlaps/${item.id}`}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {item.caseNumbers.join(' ↔ ') || 'Overlap relationship'}
                  </Link>
                  <StatusBadge status={item.reviewStatus} />
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
                <Link
                  to={`/cases/${item.caseId}`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {item.caseNumber}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {item.remarks || 'Escalated'} · {formatDate(item.createdAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Case activity</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Assigned</p>
              <p className="mt-1 text-xl font-semibold">{data?.assigned ?? 0}</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Under process</p>
              <p className="mt-1 text-xl font-semibold">{data?.underProcess ?? 0}</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Escalated</p>
              <p className="mt-1 text-xl font-semibold">{data?.escalated ?? 0}</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Reopened</p>
              <p className="mt-1 text-xl font-semibold">{data?.reopened ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
