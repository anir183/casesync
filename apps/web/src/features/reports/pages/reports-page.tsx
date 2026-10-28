import { type FormEvent, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { matchTypeLabel } from '#/features/overlaps/labels'
import type { ReportFilters, ReportGroupRow, ReportsSummary } from '../api'
import { useReports } from '../api'

const CELL = 'px-3 py-2 text-sm'
const HEAD_CELL = `${CELL} text-xs uppercase tracking-wide text-muted-foreground`

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

function CountTable({
  title,
  rows,
  labelKey,
}: {
  title: string
  rows: Array<{ count: number } & Record<string, string | number>>
  labelKey: string
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
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className={HEAD_CELL}>Name</th>
                <th className={HEAD_CELL}>Cases</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row[labelKey])} className="border-b border-border last:border-0">
                  <td className={CELL}>{String(row[labelKey])}</td>
                  <td className={CELL}>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

function GroupTable({ title, rows }: { title: string; rows: ReportGroupRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          <table className="w-full border-collapse text-left">
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
                <tr key={row.name} className="border-b border-border last:border-0">
                  <td className={CELL}>{row.name}</td>
                  <td className={CELL}>{row.total}</td>
                  <td className={CELL}>{row.open}</td>
                  <td className={CELL}>{row.disposed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

function MonthlyChart({ data }: { data: ReportsSummary['monthly'] }) {
  const max = Math.max(...data.flatMap((item) => [item.received, item.disposed]), 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly received vs disposed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item) => (
          <div key={item.month} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{item.month}</span>
              <span>
                {item.received} received · {item.disposed} disposed
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-2 rounded bg-muted">
                <div
                  className="h-2 rounded bg-foreground"
                  style={{ width: `${(item.received / max) * 100}%` }}
                />
              </div>
              <div className="h-2 rounded bg-muted">
                <div
                  className="h-2 rounded bg-emerald-500"
                  style={{ width: `${(item.disposed / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function ReportsPage() {
  const [draft, setDraft] = useState<ReportFilters>({})
  const [filters, setFilters] = useState<ReportFilters>({})
  const { data, isLoading, isError, error } = useReports(filters)

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
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Bureau, institution, ageing and overlap analytics.
        </p>
      </div>

      <Card>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="report-from">
                Received from
              </label>
              <Input
                id="report-from"
                type="date"
                value={draft.dateFrom ?? ''}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dateFrom: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="report-to">
                Received to
              </label>
              <Input
                id="report-to"
                type="date"
                value={draft.dateTo ?? ''}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dateTo: event.target.value,
                  }))
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
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Unable to load reports'}
        </p>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Loading reports…</p>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total cases" value={data.totals.total} />
            <StatCard label="Open cases" value={data.totals.open} />
            <StatCard label="Disposed" value={data.totals.disposed} />
            <StatCard label="Disposal rate" value={`${data.totals.disposalRate}%`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GroupTable title="Bureau/Cell-wise" rows={data.byBureau} />
            <GroupTable title="Institution-wise" rows={data.byInstitution} />
            <GroupTable title="Region-wise" rows={data.byRegion} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending case ageing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.ageBuckets.map((bucket) => (
                  <div key={bucket.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{bucket.label}</span>
                    <span className="font-medium">{bucket.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CountTable
              title="Cases by status"
              rows={data.byStatus.map((item) => ({
                status: item.status.replace(/_/g, ' '),
                count: item.count,
              }))}
              labelKey="status"
            />
            <CountTable
              title="Cases by category"
              rows={data.byCategory.map((item) => ({
                category: item.category,
                count: item.count,
              }))}
              labelKey="category"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overlapping cases</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assessments run</span>
                  <span>{data.overlaps.assessments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total relationships</span>
                  <span>{data.overlaps.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending review</span>
                  <span>{data.overlaps.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed</span>
                  <span>{data.overlaps.confirmed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dismissed</span>
                  <span>{data.overlaps.dismissed}</span>
                </div>
                <div className="border-t border-border pt-2">
                  {data.overlaps.byMatchType.map((item) => (
                    <div key={item.matchType} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {matchTypeLabel(item.matchType)}
                      </span>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <MonthlyChart data={data.monthly} />
          </div>
        </>
      )}
    </div>
  )
}
