import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import type { GeoRegionRow } from '../api'
import {
  DEFAULT_MAP_TILE_URL,
  INDIA_MAP_BOUNDS,
  MAP_TILE_ATTRIBUTION,
  bubbleRadius,
} from './map-config'

function bubbleColor(region: GeoRegionRow) {
  if (region.total === 0) return 'var(--color-muted-foreground)'
  if (region.overdueRate >= 25) return 'var(--color-danger)'
  if (region.overdueRate >= 10) return 'var(--color-warning)'
  return 'var(--color-success)'
}

/**
 * Loaded lazily so Leaflet and its CSS stay out of the initial reports bundle.
 * The surrounding RegionMap keeps keyboard controls and a table available even
 * when a tile provider is unreachable.
 */
export default function LeafletRegionMap({
  regions,
  selectedRegionId,
  onSelect,
  caption,
}: {
  regions: GeoRegionRow[]
  selectedRegionId?: string
  onSelect?: (region: GeoRegionRow) => void
  caption: string
}) {
  const maxTotal = Math.max(...regions.map((region) => region.total), 1)

  return (
    <section
      aria-label={`${caption} map`}
      className="relative overflow-hidden rounded-xl border border-border [&_.leaflet-container]:z-0 [&_.leaflet-container]:h-[420px] [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-muted [&_.leaflet-control-attribution]:text-[10px]"
    >
      <MapContainer
        bounds={INDIA_MAP_BOUNDS}
        boundsOptions={{ padding: [16, 16] }}
        minZoom={3}
        maxZoom={9}
        scrollWheelZoom={false}
        className="z-0"
      >
        <TileLayer
          url={DEFAULT_MAP_TILE_URL}
          attribution={MAP_TILE_ATTRIBUTION}
          detectRetina
          maxZoom={19}
        />
        {regions.map((region) => {
          const selected = region.regionId === selectedRegionId
          const color = bubbleColor(region)
          return (
            <CircleMarker
              key={`${region.regionId}-${selected ? 'selected' : 'idle'}`}
              center={[region.latitude, region.longitude]}
              radius={bubbleRadius(region.total, maxTotal) + (selected ? 4 : 0)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.55,
                weight: selected ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onSelect?.(region),
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                <span className="font-medium">{region.name}</span>
                <br />
                {region.total} total · {region.overdue} overdue
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </section>
  )
}
