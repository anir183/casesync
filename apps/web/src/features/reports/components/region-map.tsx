import { type CSSProperties, Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { ChartTable } from '#/components/charts/chart-table'
import { Skeleton } from '#/components/ui/skeleton'
import type { GeoRegionRow } from '#/features/reports/api'
import { cn } from '#/lib/utils'
import {
  REGION_METRICS,
  REGION_METRIC_LABELS,
  type RegionBand,
  type RegionMetric,
  formatRegionMetric,
  regionBand,
  regionBandClassName,
  regionBandColor,
  regionBandLabel,
  regionMetricValue,
} from './map-config'

const LazyLeafletRegionMap = lazy(() => import('./leaflet-region-map'))
const LEGEND_BANDS: RegionBand[] = ['none', 'light', 'moderate', 'elevated', 'severe']

function regionLabel(region: GeoRegionRow) {
  return `${region.code.slice(0, 3)}, ${region.name}: ${region.total} total, ${region.open} open, ${region.overdue} overdue, ${region.resolutionRate}% resolved`
}

export function RegionMap({
  regions,
  caption,
  selectedRegionId,
  onSelect,
  className,
  showMap = true,
}: {
  regions: GeoRegionRow[]
  caption: string
  selectedRegionId?: string
  onSelect?: (region: GeoRegionRow) => void
  className?: string
  showMap?: boolean
}) {
  const [metric, setMetric] = useState<RegionMetric>('overdueRate')
  const [activeId, setActiveId] = useState<string | undefined>(selectedRegionId)
  const [hoveredId, setHoveredId] = useState<string | undefined>()
  const [mapActiveId, setMapActiveId] = useState<string | undefined>()
  // Keyboard focus outranks a resting pointer: scrolling a chip into view can
  // otherwise fire mouseenter on a different chip and replace the summary.
  const active = regions.find((item) => item.regionId === (activeId ?? mapActiveId ?? hoveredId))
  const maxValue = Math.max(...regions.map((region) => regionMetricValue(region, metric)), 1)

  useEffect(() => {
    if (selectedRegionId) setActiveId(selectedRegionId)
  }, [selectedRegionId])

  const handleMapActive = useCallback((region?: GeoRegionRow) => {
    setMapActiveId(region?.regionId)
  }, [])

  if (regions.length === 0) {
    return (
      <div className={cn('space-y-3', className)}>
        <p className="text-sm text-muted-foreground">
          No region data is available for the selected filters.
        </p>
        <ChartTable
          caption={`${caption} data table`}
          columns={['Region', 'Total', 'Open', 'Disposed', 'Overdue', 'Resolved']}
          rows={[]}
        />
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <fieldset className="flex flex-wrap gap-1">
        <legend className="sr-only">Map metric</legend>
        {REGION_METRICS.map((item) => {
          const pressed = metric === item
          return (
            <button
              key={item}
              type="button"
              aria-pressed={pressed}
              onClick={() => setMetric(item)}
              className={cn(
                'rounded-md border px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                pressed
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {REGION_METRIC_LABELS[item]}
            </button>
          )
        })}
      </fieldset>

      {showMap && (
        <figure>
          <figcaption className="sr-only">{caption}</figcaption>
          <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-xl" />}>
            <LazyLeafletRegionMap
              regions={regions}
              caption={caption}
              selectedRegionId={selectedRegionId}
              onSelect={onSelect}
              onActive={handleMapActive}
              metric={metric}
            />
          </Suspense>
        </figure>
      )}

      <ul aria-label="Select a region" className="flex flex-wrap gap-2">
        {regions.map((region) => {
          const selected = region.regionId === selectedRegionId
          const band = regionBand(region, metric, maxValue)
          return (
            <li key={region.regionId}>
              <button
                type="button"
                aria-label={regionLabel(region)}
                aria-pressed={selected}
                onClick={() => onSelect?.(region)}
                onMouseEnter={() => setHoveredId(region.regionId)}
                onMouseLeave={() => setHoveredId(undefined)}
                onFocus={() => setActiveId(region.regionId)}
                onBlur={() => setActiveId(undefined)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full bg-[var(--band-color)]"
                  style={{ '--band-color': regionBandColor(metric, band) } as CSSProperties}
                />
                {region.code.slice(0, 3)}
              </button>
            </li>
          )
        })}
      </ul>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {active
          ? `${active.name}: ${active.total} total, ${active.open} open, ${active.disposed} disposed, ${active.overdue} overdue. ${REGION_METRIC_LABELS[metric]}: ${formatRegionMetric(active, metric)}.`
          : `Shading shows ${REGION_METRIC_LABELS[metric].toLowerCase()}. Every region is selectable below and listed in the data table.`}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {LEGEND_BANDS.map((band) => (
          <span key={band} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn('h-2.5 w-2.5 rounded-sm', regionBandClassName(metric, band))}
            />
            {regionBandLabel(metric, band)}
          </span>
        ))}
        <span className="w-full text-meta">
          Schematic catchments use Natural Earth state outlines grouped to the seeded regions, not
          official AICTE boundaries. Made with Natural Earth. Base map © OpenStreetMap contributors.
        </span>
      </div>

      <ChartTable
        caption={`${caption} data table`}
        columns={['Region', 'Total', 'Open', 'Disposed', 'Overdue', 'Resolved']}
        rows={regions.map((region) => [
          region.name,
          region.total,
          region.open,
          region.disposed,
          region.overdue,
          `${region.resolutionRate}%`,
        ])}
      />
    </div>
  )
}
