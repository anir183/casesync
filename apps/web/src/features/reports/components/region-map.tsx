import { Suspense, lazy, useEffect, useState } from 'react'
import { ChartTable } from '#/components/charts/chart-table'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import type { GeoRegionRow } from '../api'

const LazyLeafletRegionMap = lazy(() => import('./leaflet-region-map'))

function bubbleColor(region: GeoRegionRow) {
  if (region.total === 0) return 'var(--color-muted-foreground)'
  if (region.overdueRate >= 25) return 'var(--color-danger)'
  if (region.overdueRate >= 10) return 'var(--color-warning)'
  return 'var(--color-success)'
}

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
  const [activeId, setActiveId] = useState<string | undefined>(selectedRegionId)
  const active = regions.find((item) => item.regionId === activeId)

  useEffect(() => {
    if (selectedRegionId) setActiveId(selectedRegionId)
  }, [selectedRegionId])

  return (
    <div className={cn('space-y-3', className)}>
      {showMap && (
        <figure>
          <figcaption className="sr-only">{caption}</figcaption>
          <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-xl" />}>
            <LazyLeafletRegionMap
              regions={regions}
              caption={caption}
              selectedRegionId={selectedRegionId}
              onSelect={onSelect}
            />
          </Suspense>
        </figure>
      )}

      <ul aria-label="Select a region" className="flex flex-wrap gap-2">
        {regions.map((region) => {
          const selected = region.regionId === selectedRegionId
          return (
            <li key={region.regionId}>
              <button
                type="button"
                aria-label={regionLabel(region)}
                aria-pressed={selected}
                onClick={() => onSelect?.(region)}
                onMouseEnter={() => setActiveId(region.regionId)}
                onMouseLeave={() => setActiveId(undefined)}
                onFocus={() => setActiveId(region.regionId)}
                onBlur={() => setActiveId(undefined)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: bubbleColor(region) }}
                />
                {region.code.slice(0, 3)}
              </button>
            </li>
          )
        })}
      </ul>

      <p className="text-sm text-muted-foreground">
        {active
          ? `${active.name}: ${active.total} total, ${active.open} open, ${active.disposed} disposed, ${active.overdue} overdue.`
          : 'Bubble size shows case volume. Colour shows overdue pressure: green low, amber elevated, red high. The map is supplementary; every region is selectable below and listed in the data table.'}
      </p>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-success" /> Low overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-warning" /> Elevated
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-danger" /> High
        </span>
        <span className="ml-auto text-[11px]">Base map © OpenStreetMap contributors</span>
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
