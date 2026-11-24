import { BarChart } from '#/components/charts/bar-chart'
import { ChartCard } from '#/components/charts/chart-card'
import { DonutChart } from '#/components/charts/donut-chart'
import { GaugeChart } from '#/components/charts/gauge-chart'
import { TrendChart } from '#/components/charts/trend-chart'
import { Skeleton } from '#/components/ui/skeleton'
import type { GeoRegionRow, ReportsSummary } from '#/features/reports/api'
import { RegionMap } from '#/features/reports/components/region-map'
import { titleCase } from '#/features/reports/filters'

export function ReportCharts({
  data,
  geoRegions,
  isGeoLoading = false,
  selectedRegionId,
  onRegionSelect,
}: {
  data: ReportsSummary
  geoRegions?: GeoRegionRow[]
  isGeoLoading?: boolean
  selectedRegionId?: string
  onRegionSelect: (region: GeoRegionRow) => void
}) {
  const statusData = data.byStatus.map((item) => ({
    label: titleCase(item.status),
    value: item.count,
  }))

  return (
    <section aria-label="Report charts" className="space-y-4">
      <p className="text-compact text-muted-foreground">
        Existing charts for the current filter set, grouped by trend, mix, and comparison.
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

      <ChartCard
        title="Regional pressure"
        description="Select a region marker or chip to apply the region filter."
      >
        {isGeoLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : geoRegions?.length ? (
          <RegionMap
            regions={geoRegions}
            caption="Regional case pressure"
            selectedRegionId={selectedRegionId}
            onSelect={onRegionSelect}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No mapped regions are in scope.</p>
        )}
      </ChartCard>
    </section>
  )
}
