import type { LatLngBoundsExpression } from 'leaflet'
import type { GeoRegionRow } from '#/features/reports/api'

/** India-wide view used by the reports map, including island territories. */
export const INDIA_MAP_BOUNDS: LatLngBoundsExpression = [
  [6.5, 68],
  [36.5, 97.5],
]

/**
 * OpenStreetMap raster tiles are the default. Deployments can point this at a
 * self-hosted or regional tile provider without changing the map component.
 */
export const DEFAULT_MAP_TILE_URL =
  import.meta.env?.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export const REGION_METRICS = ['total', 'open', 'overdueRate', 'resolutionRate'] as const

export type RegionMetric = (typeof REGION_METRICS)[number]

export type RegionBand = 'none' | 'light' | 'moderate' | 'elevated' | 'severe'

export const REGION_METRIC_LABELS: Record<RegionMetric, string> = {
  total: 'Total',
  open: 'Open',
  overdueRate: 'Overdue rate',
  resolutionRate: 'Resolved rate',
}

const REGION_BAND_STYLES: Record<
  RegionMetric,
  Record<RegionBand, { color: string; className: string }>
> = {
  total: {
    none: { color: 'var(--color-muted-foreground)', className: 'bg-muted-foreground' },
    light: { color: 'var(--color-chart-1)', className: 'bg-chart-1' },
    moderate: { color: 'var(--color-chart-4)', className: 'bg-chart-4' },
    elevated: { color: 'var(--color-chart-2)', className: 'bg-chart-2' },
    severe: { color: 'var(--color-chart-5)', className: 'bg-chart-5' },
  },
  open: {
    none: { color: 'var(--color-muted-foreground)', className: 'bg-muted-foreground' },
    light: { color: 'var(--color-chart-1)', className: 'bg-chart-1' },
    moderate: { color: 'var(--color-chart-4)', className: 'bg-chart-4' },
    elevated: { color: 'var(--color-chart-2)', className: 'bg-chart-2' },
    severe: { color: 'var(--color-chart-5)', className: 'bg-chart-5' },
  },
  overdueRate: {
    none: { color: 'var(--color-muted-foreground)', className: 'bg-muted-foreground' },
    light: { color: 'var(--color-success)', className: 'bg-success' },
    moderate: { color: 'var(--color-warning)', className: 'bg-warning' },
    elevated: { color: 'var(--color-chart-3)', className: 'bg-chart-3' },
    severe: { color: 'var(--color-danger)', className: 'bg-danger' },
  },
  resolutionRate: {
    none: { color: 'var(--color-muted-foreground)', className: 'bg-muted-foreground' },
    light: { color: 'var(--color-success)', className: 'bg-success' },
    moderate: { color: 'var(--color-chart-2)', className: 'bg-chart-2' },
    elevated: { color: 'var(--color-warning)', className: 'bg-warning' },
    severe: { color: 'var(--color-danger)', className: 'bg-danger' },
  },
}

const REGION_BAND_LABELS: Record<RegionMetric, Record<RegionBand, string>> = {
  total: {
    none: 'No cases',
    light: 'Light',
    moderate: 'Moderate',
    elevated: 'Elevated',
    severe: 'Heavy',
  },
  open: {
    none: 'None open',
    light: 'Light',
    moderate: 'Moderate',
    elevated: 'Elevated',
    severe: 'Heavy',
  },
  overdueRate: {
    none: 'No overdue',
    light: 'Low',
    moderate: 'Elevated',
    elevated: 'High',
    severe: 'Severe',
  },
  resolutionRate: {
    none: 'No data',
    light: 'Strong',
    moderate: 'Good',
    elevated: 'Lagging',
    severe: 'Critical',
  },
}

export function bubbleRadius(total: number, maxTotal: number) {
  if (total === 0) return 6
  return 8 + Math.sqrt(total / Math.max(maxTotal, 1)) * 18
}

export function regionMetricValue(region: GeoRegionRow, metric: RegionMetric) {
  return region[metric]
}

export function formatRegionMetric(region: GeoRegionRow, metric: RegionMetric) {
  const value = regionMetricValue(region, metric)
  return metric === 'overdueRate' || metric === 'resolutionRate' ? `${value}%` : `${value}`
}

export function regionBand(
  region: GeoRegionRow,
  metric: RegionMetric,
  maxValue: number,
): RegionBand {
  const value = regionMetricValue(region, metric)
  if (value <= 0) return 'none'

  if (metric === 'total' || metric === 'open') {
    const ratio = value / Math.max(maxValue, 1)
    if (ratio <= 0.25) return 'light'
    if (ratio <= 0.5) return 'moderate'
    if (ratio <= 0.75) return 'elevated'
    return 'severe'
  }

  if (metric === 'overdueRate') {
    if (value < 10) return 'light'
    if (value < 25) return 'moderate'
    if (value < 40) return 'elevated'
    return 'severe'
  }

  if (value >= 75) return 'light'
  if (value >= 50) return 'moderate'
  if (value >= 25) return 'elevated'
  return 'severe'
}

export function regionBandColor(metric: RegionMetric, band: RegionBand) {
  return REGION_BAND_STYLES[metric][band].color
}

export function regionBandClassName(metric: RegionMetric, band: RegionBand) {
  return REGION_BAND_STYLES[metric][band].className
}

export function regionBandLabel(metric: RegionMetric, band: RegionBand) {
  return REGION_BAND_LABELS[metric][band]
}
