import { describe, expect, test } from 'bun:test'
import { aggregateRegionGeo } from '#/modules/reports/report.service'

const NOW = new Date('2026-10-30T00:00:00.000Z')

describe('region geo aggregation', () => {
  const regions = [
    { regionId: 'north', code: 'NORTH', name: 'Northern Region', latitude: 26.4, longitude: 80.3 },
    { regionId: 'south', code: 'SOUTH', name: 'Southern Region', latitude: 13.1, longitude: 80.3 },
    { regionId: 'unmapped', code: 'NONE', name: 'Unmapped Region' },
  ]

  test('counts totals, disposals, overdue cases and rates', () => {
    const rows = aggregateRegionGeo(
      regions,
      [
        {
          status: 'DISPOSED',
          regionId: 'north',
          expectedDisposalAt: new Date('2026-10-25T00:00:00.000Z'),
        },
        {
          status: 'UNDER_PROCESS',
          regionId: 'north',
          expectedDisposalAt: new Date('2026-10-20T00:00:00.000Z'),
        },
        {
          status: 'RECEIVED',
          institutionRegionId: 'south',
          expectedDisposalAt: new Date('2026-11-10T00:00:00.000Z'),
        },
      ],
      NOW,
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      regionId: 'north',
      total: 2,
      open: 1,
      disposed: 1,
      overdue: 1,
      resolutionRate: 50,
      overdueRate: 50,
    })
    expect(rows[1]).toMatchObject({
      regionId: 'south',
      total: 1,
      open: 1,
      disposed: 0,
      overdue: 0,
      resolutionRate: 0,
      overdueRate: 0,
    })
  })

  test('returns zero counts for mapped regions without cases', () => {
    const rows = aggregateRegionGeo(regions, [], NOW)
    expect(rows.map((row) => row.regionId)).toEqual(['north', 'south'])
    expect(rows.every((row) => row.total === 0 && row.open === 0 && row.overdue === 0)).toBe(true)
  })

  test('skips cases outside mapped regions and regions without coordinates', () => {
    const rows = aggregateRegionGeo(
      regions,
      [
        { status: 'RECEIVED', regionId: 'unmapped' },
        { status: 'RECEIVED', regionId: 'missing' },
        { status: 'RECEIVED' },
      ],
      NOW,
    )
    expect(rows.map((row) => row.regionId)).toEqual(['north', 'south'])
    expect(rows.every((row) => row.total === 0)).toBe(true)
  })
})
