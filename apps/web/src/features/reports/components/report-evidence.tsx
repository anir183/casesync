import { ChartCard } from '#/components/charts/chart-card'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { matchTypeLabel } from '#/features/overlaps/labels'
import type { GeoRegionRow, ReportsSummary } from '#/features/reports/api'
import { RegionMap } from '#/features/reports/components/region-map'
import { CountTable, GroupTable } from '#/features/reports/components/report-tables'
import { titleCase } from '#/features/reports/filters'

export interface ReportEvidenceProps {
  data: ReportsSummary
  geoRegions?: GeoRegionRow[]
  isGeoLoading?: boolean
  selectedRegionId?: string
  onRegionSelect: (region: GeoRegionRow) => void
}

export function ReportEvidence({
  data,
  geoRegions,
  isGeoLoading = false,
  selectedRegionId,
  onRegionSelect,
}: ReportEvidenceProps) {
  return (
    <section aria-label="Report evidence" className="space-y-4">
      <p className="text-compact text-muted-foreground">
        Exact counts for the current filter set come first; the existing charts remain available in
        the Charts view.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
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
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Overlap match types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.overlaps.byMatchType.length === 0 ? (
              <p className="text-muted-foreground">No overlap relationships.</p>
            ) : (
              data.overlaps.byMatchType.map((item) => (
                <div key={item.matchType} className="flex justify-between">
                  <span className="text-muted-foreground">{matchTypeLabel(item.matchType)}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

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
