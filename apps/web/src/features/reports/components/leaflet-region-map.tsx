import 'leaflet/dist/leaflet.css'
import type { Layer, GeoJSON as LeafletGeoJSON, Path } from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GeoJSON, type GeoJSONProps, MapContainer, TileLayer } from 'react-leaflet'
import type { GeoRegionRow } from '#/features/reports/api'
import catchments from '#/features/reports/data/region-catchments.json'
import {
  DEFAULT_MAP_TILE_URL,
  INDIA_MAP_BOUNDS,
  MAP_TILE_ATTRIBUTION,
  REGION_METRIC_LABELS,
  type RegionMetric,
  formatRegionMetric,
  regionBand,
  regionBandColor,
  regionMetricValue,
} from './map-config'

type CatchmentProperties = {
  code: string
  name: string
}

type KeyboardLayer = {
  code: string
  element: Element
  onFocus: () => void
  onBlur: () => void
  onKeyDown: (event: Event) => void
}

type FeatureLike = { properties?: unknown }

const regionGeometry = catchments as unknown as GeoJSONProps['data']

function polygonLabel(region: GeoRegionRow, metric: RegionMetric) {
  return `${region.name}: ${REGION_METRIC_LABELS[metric]} ${formatRegionMetric(region, metric)}. ${region.total} total, ${region.open} open, ${region.overdue} overdue.`
}

function RegionPolygons({
  regions,
  metric,
  maxValue,
  selectedCode,
  onSelect,
  onActive,
}: {
  regions: GeoRegionRow[]
  metric: RegionMetric
  maxValue: number
  selectedCode?: string
  onSelect?: (region: GeoRegionRow) => void
  onActive?: (region?: GeoRegionRow) => void
}) {
  const regionsByCode = useMemo(
    () => new Map(regions.map((region) => [region.code, region])),
    [regions],
  )
  const [hoveredCode, setHoveredCode] = useState<string | undefined>()
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null)
  const callbacks = useRef({ onSelect, onActive })
  callbacks.current = { onSelect, onActive }

  useEffect(() => {
    const boundLayers: KeyboardLayer[] = []

    geoJsonRef.current?.eachLayer((layer) => {
      const feature = (layer as Layer & { feature?: FeatureLike }).feature
      const properties = feature?.properties as CatchmentProperties | null | undefined
      const code = properties?.code
      const region = code ? regionsByCode.get(code) : undefined
      const element = (layer as Path).getElement()
      if (!region || !element) return

      element.setAttribute('role', 'button')
      element.setAttribute('tabindex', '0')
      element.setAttribute('aria-label', polygonLabel(region, metric))
      element.setAttribute('aria-pressed', String(region.code === selectedCode))

      const onFocus = () => {
        setHoveredCode(region.code)
        callbacks.current.onActive?.(region)
      }
      const onBlur = () => {
        setHoveredCode(undefined)
        callbacks.current.onActive?.(undefined)
      }
      const onKeyDown = (event: Event) => {
        const keyboardEvent = event as KeyboardEvent
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          keyboardEvent.preventDefault()
          callbacks.current.onSelect?.(region)
        }
      }
      element.addEventListener('focus', onFocus)
      element.addEventListener('blur', onBlur)
      element.addEventListener('keydown', onKeyDown)
      boundLayers.push({ code: region.code, element, onFocus, onBlur, onKeyDown })
    })

    return () => {
      for (const layer of boundLayers) {
        layer.element.removeEventListener('focus', layer.onFocus)
        layer.element.removeEventListener('blur', layer.onBlur)
        layer.element.removeEventListener('keydown', layer.onKeyDown)
      }
    }
  }, [metric, regionsByCode, selectedCode])

  function onEachFeature(feature: FeatureLike, layer: Layer) {
    const properties = feature.properties as CatchmentProperties | null | undefined
    const code = properties?.code
    const region = code ? regionsByCode.get(code) : undefined
    if (!region) return

    layer.bindTooltip(polygonLabel(region, metric), { direction: 'top', sticky: true })
    layer.on({
      click: () => callbacks.current.onSelect?.(region),
      mouseover: () => {
        setHoveredCode(region.code)
        callbacks.current.onActive?.(region)
      },
      mouseout: () => {
        setHoveredCode(undefined)
        callbacks.current.onActive?.(undefined)
      },
    })
  }

  function style(feature?: FeatureLike) {
    const properties = feature?.properties as CatchmentProperties | null | undefined
    const code = properties?.code
    const region = code ? regionsByCode.get(code) : undefined
    if (!region) return { opacity: 0 }
    const band = regionBand(region, metric, maxValue)
    const color = regionBandColor(metric, band)
    const selected = region.code === selectedCode
    const hovered = region.code === hoveredCode
    return {
      color: selected ? 'var(--color-ring)' : color,
      weight: selected ? 3 : hovered ? 2 : 1,
      opacity: selected || hovered ? 1 : 0.75,
      fillColor: color,
      fillOpacity: band === 'none' ? 0.2 : hovered ? 0.75 : 0.62,
    }
  }

  return (
    <GeoJSON ref={geoJsonRef} data={regionGeometry} style={style} onEachFeature={onEachFeature} />
  )
}

/**
 * Loaded lazily so Leaflet, its CSS, and the bundled geometry stay out of the
 * initial reports bundle. The surrounding RegionMap keeps keyboard controls and
 * a table available even when a tile provider is unreachable.
 */
export default function LeafletRegionMap({
  regions,
  selectedRegionId,
  onSelect,
  onActive,
  caption,
  metric,
}: {
  regions: GeoRegionRow[]
  selectedRegionId?: string
  onSelect?: (region: GeoRegionRow) => void
  onActive?: (region?: GeoRegionRow) => void
  caption: string
  metric: RegionMetric
}) {
  const [tilesUnavailable, setTilesUnavailable] = useState(false)
  const selectedCode = regions.find((region) => region.regionId === selectedRegionId)?.code
  const maxValue = Math.max(...regions.map((region) => regionMetricValue(region, metric)), 1)

  return (
    <section
      aria-label={`${caption} map`}
      className="relative overflow-hidden rounded-xl border border-border [&_.leaflet-container]:z-0 [&_.leaflet-container]:h-[420px] [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-muted [&_.leaflet-control-attribution]:text-meta"
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
          eventHandlers={{ tileerror: () => setTilesUnavailable(true) }}
        />
        <RegionPolygons
          key={metric}
          regions={regions}
          metric={metric}
          maxValue={maxValue}
          selectedCode={selectedCode}
          onSelect={onSelect}
          onActive={onActive}
        />
      </MapContainer>
      {tilesUnavailable && (
        <p className="pointer-events-none absolute inset-x-3 top-3 z-[500] rounded-lg border border-border bg-card/95 px-3 py-2 text-compact text-foreground shadow-sm">
          Base tiles are unavailable. Region shapes, chips, and the data table remain available.
        </p>
      )}
    </section>
  )
}
