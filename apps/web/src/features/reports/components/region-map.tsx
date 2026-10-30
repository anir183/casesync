import { type KeyboardEvent, useId, useState } from 'react'
import { ChartTable } from '#/components/charts/chart-table'
import { cn } from '#/lib/utils'
import type { GeoRegionRow } from '../api'
import { MAP_VIEWBOX, outlinePath, projectCoordinate } from './india-outline'

function bubbleColor(region: GeoRegionRow) {
  if (region.total === 0) return 'var(--color-muted-foreground)'
  if (region.overdueRate >= 25) return 'var(--color-danger)'
  if (region.overdueRate >= 10) return 'var(--color-warning)'
  return 'var(--color-success)'
}

function radiusFor(region: GeoRegionRow, maxTotal: number) {
  if (region.total === 0) return 5
  return 7 + Math.sqrt(region.total / Math.max(maxTotal, 1)) * 19
}

export function RegionMap({
  regions,
  caption,
  selectedRegionId,
  onSelect,
  className,
}: {
  regions: GeoRegionRow[]
  caption: string
  selectedRegionId?: string
  onSelect?: (region: GeoRegionRow) => void
  className?: string
}) {
  const [activeId, setActiveId] = useState<string | undefined>(selectedRegionId)
  const descriptionId = useId()
  const maxTotal = Math.max(...regions.map((item) => item.total), 1)
  const active = regions.find((item) => item.regionId === activeId)

  function handleKeyDown(event: KeyboardEvent<SVGGElement>, region: GeoRegionRow) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect?.(region)
  }

  return (
    <div className={cn('space-y-3', className)}>
      <figure className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-accent/5">
        <figcaption className="sr-only">{caption}</figcaption>
        <svg
          viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
          aria-describedby={descriptionId}
          className="mx-auto h-auto w-full max-w-[560px]"
        >
          <title>{caption}</title>
          <path
            d={outlinePath()}
            fill="var(--color-muted)"
            stroke="var(--color-border)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {regions.map((region) => {
            const point = projectCoordinate(region.longitude, region.latitude)
            const radius = radiusFor(region, maxTotal)
            const selected = region.regionId === selectedRegionId
            const shortCode = region.code.slice(0, 3)
            return (
              <g
                key={region.regionId}
                role={onSelect ? 'button' : undefined}
                tabIndex={onSelect ? 0 : undefined}
                aria-label={`${shortCode}, ${region.name}: ${region.total} total, ${region.open} open, ${region.overdue} overdue, ${region.resolutionRate}% resolved`}
                onClick={() => onSelect?.(region)}
                onKeyDown={(event) => handleKeyDown(event, region)}
                onMouseEnter={() => setActiveId(region.regionId)}
                onFocus={() => setActiveId(region.regionId)}
                onMouseLeave={() => setActiveId(undefined)}
                onBlur={() => setActiveId(undefined)}
                className={cn(
                  onSelect &&
                    'cursor-pointer outline-none focus-visible:opacity-100 [&:focus-visible>circle]:stroke-ring [&:focus-visible>circle]:stroke-[4px]',
                )}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius + (selected ? 4 : 0)}
                  fill={bubbleColor(region)}
                  fillOpacity="0.55"
                  stroke={bubbleColor(region)}
                  strokeWidth={selected ? 3 : 2}
                >
                  <title>{`${region.name}: ${region.total} total, ${region.overdue} overdue`}</title>
                </circle>
                {region.total > 0 ? (
                  <text
                    x={point.x}
                    y={point.y + 3}
                    textAnchor="middle"
                    className="pointer-events-none fill-foreground text-[10px] font-semibold"
                  >
                    {shortCode}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
      </figure>
      <p id={descriptionId} className="text-sm text-muted-foreground">
        {active
          ? `${active.name}: ${active.total} total, ${active.open} open, ${active.disposed} disposed, ${active.overdue} overdue.`
          : 'Bubble size shows case volume. Colour shows overdue pressure: green low, amber elevated, red high.'}
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
