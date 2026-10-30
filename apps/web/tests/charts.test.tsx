import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { niceMax, percentage, sumValues } from '../src/components/charts/chart-utils'
import { DonutChart } from '../src/components/charts/donut-chart'
import type { GeoRegionRow } from '../src/features/reports/api'
import { MAP_VIEWBOX, projectCoordinate } from '../src/features/reports/components/india-outline'
import { RegionMap } from '../src/features/reports/components/region-map'

const regions: GeoRegionRow[] = [
  {
    regionId: 'north',
    code: 'NORTH',
    name: 'Northern Region',
    latitude: 28.61,
    longitude: 77.21,
    total: 9,
    open: 7,
    disposed: 2,
    overdue: 1,
    resolutionRate: 22,
    overdueRate: 11,
  },
  {
    regionId: 'south',
    code: 'SOUTH',
    name: 'Southern Region',
    latitude: 13.08,
    longitude: 80.27,
    total: 0,
    open: 0,
    disposed: 0,
    overdue: 0,
    resolutionRate: 0,
    overdueRate: 0,
  },
]

afterEach(cleanup)

describe('chart math', () => {
  test('bounds percentages and totals empty series', () => {
    expect(percentage(5, 10)).toBe(50)
    expect(percentage(-1, 10)).toBe(0)
    expect(percentage(20, 10)).toBe(100)
    expect(percentage(1, 0)).toBe(0)
    expect(sumValues([{ value: 2 }, { value: 3 }])).toBe(5)
    expect(niceMax([0])).toBe(1)
    expect(niceMax([9])).toBe(10)
    expect(niceMax([120])).toBe(200)
  })

  test('renders donut data as text and an accessible data table', () => {
    render(
      <DonutChart
        caption="Cases by status"
        data={[
          { label: 'Open', value: 3 },
          { label: 'Disposed', value: 1 },
        ]}
      />,
    )

    expect(screen.getByRole('img', { name: /Cases by status/ })).toBeDefined()
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Disposed').length).toBeGreaterThan(0)
  })
})

describe('regional map', () => {
  test('projects national coordinates inside the viewbox', () => {
    const delhi = projectCoordinate(77.21, 28.61)
    expect(delhi.x).toBeGreaterThan(MAP_VIEWBOX.padding)
    expect(delhi.x).toBeLessThan(MAP_VIEWBOX.width - MAP_VIEWBOX.padding)
    expect(delhi.y).toBeGreaterThan(MAP_VIEWBOX.padding)
    expect(delhi.y).toBeLessThan(MAP_VIEWBOX.height - MAP_VIEWBOX.padding)
  })

  test('supports keyboard selection and exposes a data-table fallback', () => {
    let selected: GeoRegionRow | undefined
    render(
      <RegionMap
        caption="Regional pressure"
        regions={regions}
        onSelect={(region) => {
          selected = region
        }}
      />,
    )

    const north = screen.getByRole('button', { name: /NOR, Northern Region/ })
    fireEvent.keyDown(north, { key: 'Enter' })
    expect(selected?.regionId).toBe('north')
    expect(screen.getByText('View data table')).toBeDefined()
  })
})
