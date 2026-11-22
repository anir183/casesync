import { describe, expect, test } from 'bun:test'
import catchments from '../src/features/reports/data/region-catchments.json'

describe('regional catchment geometry', () => {
  test('records the public-domain schematic source', () => {
    expect(catchments.metadata.license).toBe('Public domain')
    expect(catchments.metadata.credit).toBe('Made with Natural Earth.')
    expect(catchments.metadata.sourceUrl).toContain('natural-earth-vector')
    expect(catchments.metadata.description).toContain('not official AICTE regional boundaries')
  })

  test('bundles one simplified geometry per seeded region', () => {
    expect(catchments.type).toBe('FeatureCollection')
    expect(catchments.features.map((feature) => feature.properties.code)).toEqual([
      'NORTH',
      'NORTH_WEST',
      'WEST',
      'CENTRAL',
      'EAST',
      'NORTH_EAST',
      'SOUTH_WEST',
      'SOUTH_CENTRAL',
      'SOUTH',
    ])

    for (const feature of catchments.features) {
      expect(feature.geometry.type).toBe('MultiPolygon')
      expect(feature.geometry.coordinates.length).toBeGreaterThan(0)
      for (const polygon of feature.geometry.coordinates) {
        expect(polygon[0].length).toBeGreaterThanOrEqual(4)
      }
    }
  })
})
