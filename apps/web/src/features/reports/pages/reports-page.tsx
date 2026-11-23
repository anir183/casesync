import { CASE_STATUS } from '@casesync/config'
import { type FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '#/components/shared/page-header'
import { StatCard } from '#/components/shared/stat-card'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Tabs } from '#/components/ui/tabs'
import { useBureaus, useCategories, useRegions } from '#/features/organization/api'
import type { GeoRegionRow, ReportFilters } from '#/features/reports/api'
import { downloadReports, useReports, useReportsGeo } from '#/features/reports/api'
import { ReportCharts } from '#/features/reports/components/report-charts'
import { ReportControlBand } from '#/features/reports/components/report-control-band'
import { ReportEvidence } from '#/features/reports/components/report-evidence'
import {
  cleanReportFilters,
  readReportFilters,
  reportFiltersToParams,
  titleCase,
} from '#/features/reports/filters'
import { REPORT_SAVED_VIEWS, reportViewForFilters } from '#/features/reports/saved-views'
import { formatDate } from '#/lib/utils'

const STATUS_OPTIONS = Object.values(CASE_STATUS)

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [draft, setDraft] = useState<ReportFilters>(() => readReportFilters(searchParams))
  const [filters, setFilters] = useState<ReportFilters>(() => readReportFilters(searchParams))
  const [exportError, setExportError] = useState<string>()
  const [isExporting, setIsExporting] = useState(false)
  const [view, setView] = useState('charts')
  const { data, isLoading, isError, error } = useReports(filters)
  const geo = useReportsGeo(filters)
  const { data: bureaus } = useBureaus()
  const { data: regions } = useRegions()
  const { data: categories } = useCategories()

  useEffect(() => {
    const scoped = readReportFilters(searchParams)
    setDraft(scoped)
    setFilters(scoped)
  }, [searchParams])

  function update(key: keyof ReportFilters, value: string) {
    setDraft((current) => ({ ...current, [key]: value || undefined }))
  }

  function applyFilterSet(next: ReportFilters) {
    const nextFilters = cleanReportFilters(next)
    setDraft(nextFilters)
    setFilters(nextFilters)
    setSearchParams(reportFiltersToParams(nextFilters))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    applyFilterSet(draft)
  }

  function handleReset() {
    applyFilterSet({})
    setExportError(undefined)
  }

  function handleSavedViewChange(id: string) {
    const view = REPORT_SAVED_VIEWS.find((candidate) => candidate.id === id)
    if (view) applyFilterSet(view.filters)
  }

  function handleFilterRemove(key: keyof ReportFilters) {
    const next = { ...filters }
    delete next[key]
    applyFilterSet(next)
  }

  function handleRegionSelect(region: GeoRegionRow) {
    applyFilterSet({ ...filters, regionId: region.regionId })
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

  const statusOptions = STATUS_OPTIONS.map((status) => ({
    value: status,
    label: titleCase(status),
  }))
  const bureauOptions = (bureaus ?? []).map((bureau) => ({
    value: bureau.id,
    label: bureau.name,
  }))
  const regionOptions = (regions ?? []).map((region) => ({
    value: region.id,
    label: region.name,
  }))
  const categoryOptions = (categories ?? []).map((category) => ({
    value: category.code,
    label: category.name,
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

      <ReportControlBand
        draft={draft}
        appliedFilters={filters}
        activeView={reportViewForFilters(filters)}
        resultCount={data?.totals.total}
        isLoading={isLoading}
        statusOptions={statusOptions}
        bureauOptions={bureauOptions}
        regionOptions={regionOptions}
        categoryOptions={categoryOptions}
        onDraftChange={update}
        onSubmit={handleSubmit}
        onReset={handleReset}
        onSavedViewChange={handleSavedViewChange}
        onFilterRemove={handleFilterRemove}
      />

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

          <Tabs
            ariaLabel="Reports views"
            value={view}
            onValueChange={setView}
            items={[
              {
                id: 'tables',
                label: 'Tables',
                content: (
                  <ReportEvidence
                    data={data}
                    geoRegions={geo.data?.regions}
                    isGeoLoading={geo.isLoading}
                    selectedRegionId={filters.regionId}
                    onRegionSelect={handleRegionSelect}
                  />
                ),
              },
              {
                id: 'charts',
                label: 'Charts',
                content: (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Regional pressure is available in the Tables view.
                    </p>
                    <ReportCharts data={data} />
                  </div>
                ),
              },
            ]}
          />
        </>
      ) : null}
    </div>
  )
}
