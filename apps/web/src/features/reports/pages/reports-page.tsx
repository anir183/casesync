import { CASE_STATUS } from '@casesync/config'
import { type FormEvent, useState } from 'react'
import { BarChart } from '#/components/charts/bar-chart'
import { ChartCard } from '#/components/charts/chart-card'
import { DonutChart } from '#/components/charts/donut-chart'
import { GaugeChart } from '#/components/charts/gauge-chart'
import { TrendChart } from '#/components/charts/trend-chart'
import { PageHeader } from '#/components/shared/page-header'
import { StatCard } from '#/components/shared/stat-card'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { useBureaus, useCategories, useRegions } from '#/features/organization/api'
import { matchTypeLabel } from '#/features/overlaps/labels'
import { formatDate } from '#/lib/utils'
import type { GeoRegionRow, ReportFilters, ReportGroupRow } from '../api'
import { downloadReports, useReports, useReportsGeo } from '../api'
import { RegionMap } from '../components/region-map'

const CELL = 'px-3 py-2.5 text-sm'
const HEAD_CELL = `${CELL} text-xs font-medium uppercase tracking-wide text-muted-foreground`
const STATUS_OPTIONS = Object.values(CASE_STATUS)

function cleanFilters(input: ReportFilters): ReportFilters {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => Boolean(value)),
  ) as ReportFilters
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
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
          <div className="overflow-x-auto">
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
          </div>
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
          <div className="overflow-x-auto">
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
                  <tr key={row.name} className="border-b border-border last:border-0">
                    <td className={CELL}>{row.name}</td>
                    <td className={CELL}>{row.total}</td>
                    <td className={CELL}>{row.open}</td>
                    <td className={CELL}>{row.disposed}</td>
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

export function ReportsPage() {
  const [draft, setDraft] = useState<ReportFilters>({})
  const [filters, setFilters] = useState<ReportFilters>({})
  const [exportError, setExportError] = useState<string>()
  const [isExporting, setIsExporting] = useState(false)
  const { data, isLoading, isError, error } = useReports(filters)
  const geo = useReportsGeo(filters)
  const { data: bureaus } = useBureaus()
  const { data: regions } = useRegions()
  const { data: categories } = useCategories()

  function update(key: keyof ReportFilters, value: string) {
    setDraft((current) => ({ ...current, [key]: value || undefined }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFilters(cleanFilters(draft))
  }

  function handleReset() {
    setDraft({})
    setFilters({})
    setExportError(undefined)
  }

  function handleRegionSelect(region: GeoRegionRow) {
    setDraft((current) => ({ ...current, regionId: region.regionId }))
    setFilters((current) => ({ ...current, regionId: region.regionId }))
  }

  async function handleExport() {
    setIsExporting(true)
    setExportError(undefined)
    try {
      await downloadReports(filters)
    } catch (exportFailure) {
      setExportError(
        exportFailure instanceof Error ? exportFailure.message : 'Unable to export reports',
      )
    } finally {
      setIsExporting(false)
    }
  }

  const statusData = (data?.byStatus ?? []).map((item) => ({
    label: titleCase(item.status),
    value: item.count,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Bureau, institution, region, ageing and overlap analytics with the current filter set."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExport()}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="report-from">
                Received from
              </label>
              <Input
                id="report-from"
                type="date"
                value={draft.dateFrom ?? ''}
                onChange={(event) => update('dateFrom', event.target.value)}
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
                onChange={(event) => update('dateTo', event.target.value)}
              />
            </div>
            <Select
              aria-label="Bureau"
              value={draft.bureauId ?? ''}
              onChange={(event) => update('bureauId', event.target.value)}
            >
              <option value="">All bureaus/cells</option>
              {bureaus?.map((bureau) => (
                <option key={bureau.id} value={bureau.id}>
                  {bureau.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Region"
              value={draft.regionId ?? ''}
              onChange={(event) => update('regionId', event.target.value)}
            >
              <option value="">All regions</option>
              {regions?.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Status"
              value={draft.status ?? ''}
              onChange={(event) => update('status', event.target.value)}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Category"
              value={draft.category ?? ''}
              onChange={(event) => update('category', event.target.value)}
            >
              <option value="">All categories</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.code}>
                  {category.name}
                </option>
              ))}
            </Select>
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {exportError && <p className="text-sm text-danger-soft-foreground">{exportError}</p>}
      {isError && (
        <p className="text-sm text-danger-soft-foreground">
          {error instanceof Error ? error.message : 'Unable to load reports'}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {['total', 'open', 'disposed', 'reopened', 'overdue', 'rate'].map((key) => (
            <Skeleton key={key} className="h-24" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Total cases" value={data.totals.total} tone="primary" />
            <StatCard label="Open cases" value={data.totals.open} tone="info" />
            <StatCard label="Disposed" value={data.totals.disposed} tone="success" />
            <StatCard label="Reopened" value={data.totals.reopened} tone="warning" />
            <StatCard
              label="Beyond timeline"
              value={data.totals.beyondTimelines}
              tone={data.totals.beyondTimelines ? 'danger' : 'success'}
            />
            <StatCard label="Disposal rate" value={`${data.totals.disposalRate}%`} tone="success" />
          </div>

          <p className="text-xs text-muted-foreground">
            Generated {formatDate(data.generatedAt)}
            {data.range.from || data.range.to
              ? ` · ${data.range.from ? formatDate(data.range.from) : 'start'} to ${
                  data.range.to ? formatDate(data.range.to) : 'now'
                }`
              : ''}
          </p>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Received vs disposal actions"
              description="Monthly volume over the selected range."
              className="lg:col-span-2"
            >
              <TrendChart
                data={data.monthly.map((item) => ({
                  label: item.month,
                  received: item.received,
                  disposed: item.disposed,
                }))}
                caption="Monthly received versus disposal actions"
              />
            </ChartCard>
            <ChartCard title="Status mix" description="Current status distribution.">
              <DonutChart data={statusData} caption="Cases by status" centerLabel="Cases" />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Categories" description="Top complaint categories.">
              <BarChart
                data={data.byCategory.map((item) => ({
                  label: titleCase(item.category),
                  value: item.count,
                }))}
                caption="Cases by category"
              />
            </ChartCard>
            <ChartCard title="Pending case ageing" description="Open cases by age band.">
              <BarChart
                data={data.ageBuckets.map((item) => ({
                  label: item.label,
                  value: item.count,
                }))}
                caption="Pending case ageing"
                color="var(--color-chart-3)"
              />
            </ChartCard>
            <ChartCard title="Disposal rate" description="Disposed cases as a share of the total.">
              <GaugeChart
                value={data.totals.disposalRate}
                label="disposed"
                caption="Disposal rate"
                tone={data.totals.disposalRate >= 70 ? 'success' : 'primary'}
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Bureau comparison" description="Volume by bureau or cell.">
              <BarChart
                data={data.byBureau.map((item) => ({ label: item.name, value: item.total }))}
                caption="Cases by bureau"
              />
            </ChartCard>
            <ChartCard title="Region comparison" description="Volume by region.">
              <BarChart
                data={data.byRegion.map((item) => ({ label: item.name, value: item.total }))}
                caption="Cases by region"
                color="var(--color-chart-2)"
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Regional pressure"
              description="Select a region bubble to apply the region filter."
              className="lg:col-span-2"
            >
              {geo.isLoading ? (
                <Skeleton className="h-56 w-full" />
              ) : geo.data?.regions.length ? (
                <RegionMap
                  regions={geo.data.regions}
                  caption="Regional case pressure"
                  selectedRegionId={filters.regionId}
                  onSelect={handleRegionSelect}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No mapped regions are in scope.</p>
              )}
            </ChartCard>
            <ChartCard title="Overlap outcomes" description="Relationships by review state.">
              <DonutChart
                data={[
                  { label: 'Pending review', value: data.overlaps.pending },
                  { label: 'Confirmed', value: data.overlaps.confirmed },
                  { label: 'Dismissed', value: data.overlaps.dismissed },
                ]}
                caption="Overlap review outcomes"
                centerLabel="Relationships"
              />
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Assessments</p>
                  <p className="font-semibold">{data.overlaps.assessments}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Relationships</p>
                  <p className="font-semibold">{data.overlaps.total}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Auto-merged</p>
                  <p className="font-semibold">{data.overlaps.autoMerged}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Manually merged</p>
                  <p className="font-semibold">{data.overlaps.manuallyMerged}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Manual review</p>
                  <p className="font-semibold">{data.overlaps.manualReview}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Reverted</p>
                  <p className="font-semibold">{data.overlaps.reverted}</p>
                </div>
                <div className="col-span-2 rounded-lg bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Average time to review</p>
                  <p className="font-semibold">{data.overlaps.averageReviewHours} hours</p>
                </div>
              </div>
            </ChartCard>
          </div>

          <details className="rounded-xl border border-border bg-card p-4 shadow-card">
            <summary className="cursor-pointer select-none font-medium">
              Detailed tables and breakdowns
            </summary>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <GroupTable title="Bureau/Cell-wise" rows={data.byBureau} />
              <GroupTable title="Institution-wise" rows={data.byInstitution} />
              <GroupTable title="Region-wise" rows={data.byRegion} />
              <CountTable
                title="Cases by status"
                rows={data.byStatus.map((item) => ({
                  status: titleCase(item.status),
                  count: item.count,
                }))}
                labelKey="status"
              />
              <CountTable
                title="Cases by category"
                rows={data.byCategory.map((item) => ({
                  category: titleCase(item.category),
                  count: item.count,
                }))}
                labelKey="category"
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Overlap match types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {data.overlaps.byMatchType.length === 0 ? (
                    <p className="text-muted-foreground">No overlap relationships.</p>
                  ) : (
                    data.overlaps.byMatchType.map((item) => (
                      <div key={item.matchType} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {matchTypeLabel(item.matchType)}
                        </span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </details>
        </>
      ) : null}
    </div>
  )
}
