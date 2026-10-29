import { CASE_STATUS } from '@casesync/config'
import { type FormEvent, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { useBureaus, useCategories, useRegions } from '#/features/organization/api'
import { matchTypeLabel } from '#/features/overlaps/labels'
import { formatDate } from '#/lib/utils'
import type { ReportFilters, ReportGroupRow } from '../api'
import { downloadReports, useReports } from '../api'

const CELL = 'px-3 py-2 text-sm'
const HEAD_CELL = `${CELL} text-xs uppercase tracking-wide text-muted-foreground`
const STATUS_OPTIONS = Object.values(CASE_STATUS)

function cleanFilters(input: ReportFilters): ReportFilters {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => Boolean(value)),
  ) as ReportFilters
}

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

interface TrendPoint {
  label: string
  received: number
  disposed: number
}

function TrendChart({ title, data }: { title: string; data: TrendPoint[] }) {
  const max = Math.max(...data.flatMap((item) => [item.received, item.disposed]), 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 && <p className="text-sm text-muted-foreground">No data.</p>}
        {data.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{item.label}</span>
              <span>
                {item.received} received · {item.disposed} disposal actions
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
  const [exportError, setExportError] = useState<string>()
  const [isExporting, setIsExporting] = useState(false)
  const { data, isLoading, isError, error } = useReports(filters)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Bureau, institution, region, ageing and overlap analytics.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleExport()}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
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
                  {status.replace(/_/g, ' ')}
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

      {exportError && <p className="text-sm text-red-600">{exportError}</p>}
      {isError && (
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Unable to load reports'}
        </p>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Loading reports…</p>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total cases" value={data.totals.total} />
            <StatCard label="Open cases" value={data.totals.open} />
            <StatCard label="Disposed" value={data.totals.disposed} />
            <StatCard label="Reopened" value={data.totals.reopened} />
            <StatCard label="Disposal rate" value={`${data.totals.disposalRate}%`} />
          </div>

          <p className="text-xs text-muted-foreground">
            Generated {formatDate(data.generatedAt)}
            {data.range.from || data.range.to
              ? ` · ${data.range.from ? formatDate(data.range.from) : 'start'} to ${
                  data.range.to ? formatDate(data.range.to) : 'now'
                }`
              : ''}
          </p>

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
            <TrendChart
              title="Monthly received vs disposal actions"
              data={data.monthly.map((item) => ({
                label: item.month,
                received: item.received,
                disposed: item.disposed,
              }))}
            />
          </div>

          <TrendChart
            title="Quarterly received vs disposal actions"
            data={data.quarterly.map((item) => ({
              label: item.quarter,
              received: item.received,
              disposed: item.disposed,
            }))}
          />
        </>
      )}
    </div>
  )
}
