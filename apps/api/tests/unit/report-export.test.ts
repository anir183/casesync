import { describe, expect, test } from 'bun:test'
import { buildReportsCsv } from '#/modules/reports/report.export'
import type { ReportsSummary } from '#/modules/reports/report.service'

const SUMMARY: ReportsSummary = {
  generatedAt: '2026-10-29T12:00:00.000Z',
  range: { from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T23:59:59.999Z' },
  totals: { total: 2, open: 1, disposed: 1, reopened: 0, beyondTimelines: 0, disposalRate: 50 },
  byStatus: [{ status: 'DISPOSED', count: 1 }],
  byCategory: [{ category: 'FEES', count: 1 }],
  byBureau: [{ bureauId: 'b1', name: 'RB', total: 2, open: 1, disposed: 1 }],
  byInstitution: [
    { institutionId: 'i1', name: 'Example, Institute', total: 2, open: 1, disposed: 1 },
  ],
  byRegion: [{ regionId: 'r1', name: 'North', total: 2, open: 1, disposed: 1 }],
  ageBuckets: [{ label: '0-7 days', count: 1 }],
  overlaps: {
    assessments: 1,
    total: 1,
    pending: 1,
    confirmed: 0,
    dismissed: 0,
    autoMerged: 1,
    manuallyMerged: 0,
    manualReview: 0,
    reverted: 0,
    averageReviewHours: 2.5,
    byMatchType: [{ matchType: 'INSTITUTION_EXACT_ID', count: 1 }],
  },
  monthly: [{ month: '2026-10', received: 2, disposed: 1 }],
  quarterly: [{ quarter: '2026-Q4', received: 2, disposed: 1 }],
}

describe('reports CSV export', () => {
  test('flattens report sections into labelled metric rows', () => {
    const csv = buildReportsCsv(SUMMARY)

    expect(csv).toContain('section,label,metric,value\r\n')
    expect(csv).toContain('totals,cases,disposalRate,50\r\n')
    expect(csv).toContain('byRegion,North,total,2\r\n')
    expect(csv).toContain('byInstitution,"Example, Institute",open,1\r\n')
    expect(csv).toContain('overlaps,all,autoMerged,1\r\n')
    expect(csv).toContain('overlaps,all,averageReviewHours,2.5\r\n')
    expect(csv).toContain('monthly,2026-10,disposalActions,1\r\n')
    expect(csv).toContain('quarterly,2026-Q4,received,2\r\n')
  })
})
