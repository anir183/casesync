import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'

/** India-wide view used by the reports map, including island territories. */
export const INDIA_MAP_BOUNDS: LatLngBoundsExpression = [
  [6.5, 68],
  [36.5, 97.5],
]

export const INDIA_MAP_CENTER: LatLngExpression = [22.5, 80]

/**
 * OpenStreetMap raster tiles are the default. Deployments can point this at a
 * self-hosted or regional tile provider without changing the map component.
 */
export const DEFAULT_MAP_TILE_URL =
  import.meta.env?.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export function bubbleRadius(total: number, maxTotal: number) {
  if (total === 0) return 6
  return 8 + Math.sqrt(total / Math.max(maxTotal, 1)) * 18
}
