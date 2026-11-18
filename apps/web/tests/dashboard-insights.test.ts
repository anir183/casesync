import { describe, expect, test } from 'bun:test'
import {
  buildChangeFeed,
  buildPosture,
  buildPressurePoints,
  buildSignals,
} from '../src/features/dashboard/insights'
import type { DashboardSummary } from '../src/features/dashboard/types'

const summary: DashboardSummary = {
  generatedAt: '2026-11-18T12:00:00.000Z',
  total: 10,
  open: 8,
  pending: 1,
  unassigned: 1,
  assigned: 2,
  underProcess: 2,
  disposed: 2,
  transferred: 1,
  escalated: 1,
  reopened: 1,
  beyondTimelines: 3,
  institutionWise: [
    {
      institutionId: 'institution-1',
      institutionName: 'North College',
      total: 5,
      open: 4,
      beyondTimelines: 3,
      pending: 0,
      unassigned: 0,
      assigned: 1,
      underProcess: 1,
      disposed: 1,
      transferred: 0,
      escalated: 1,
      reopened: 0,
    },
    {
      institutionId: 'institution-2',
      institutionName: 'Central College',
      total: 4,
      open: 3,
      beyondTimelines: 2,
      pending: 1,
      unassigned: 0,
      assigned: 1,
      underProcess: 1,
      disposed: 1,
      transferred: 0,
      escalated: 0,
      reopened: 0,
    },
    {
      institutionId: 'institution-3',
      institutionName: 'South College',
      total: 2,
      open: 2,
      beyondTimelines: 0,
      pending: 0,
      unassigned: 0,
      assigned: 1,
      underProcess: 1,
      disposed: 0,
      transferred: 0,
      escalated: 0,
      reopened: 0,
    },
  ],
  bureauWise: [],
  regionWise: [],
  recentOverlaps: [
    {
      id: 'overlap-1',
      matchType: 'EXACT_NAME',
      reviewStatus: 'PENDING',
      createdAt: '2026-11-18T09:00:00.000Z',
      institutionName: 'North College',
      caseNumbers: ['CASE-001', 'CASE-002'],
    },
  ],
  recentEscalations: [
    {
      id: 'escalation-1',
      caseId: 'case-3',
      caseNumber: 'CASE-003',
      remarks: 'Needs senior review',
      createdAt: '2026-11-18T11:00:00.000Z',
    },
  ],
}

describe('dashboard operational snapshots', () => {
  test('signals surface only actionable counts and keep loading honest', () => {
    const signals = buildSignals(summary, 5, 2)
    expect(signals.map((signal) => signal.label)).toEqual([
      'Needs action',
      'Beyond timeline',
      'Escalated / reopened',
      'New since you looked',
    ])
    expect(signals[0].value).toBe(5)
    expect(signals[2].value).toBe(2)
    expect(
      buildSignals(undefined, undefined, 0, true).every((signal) => signal.value === '—'),
    ).toBe(true)
  })

  test('posture segments partition the visible case total', () => {
    const segments = buildPosture(summary)
    expect(segments.reduce((sum, segment) => sum + segment.value, 0)).toBe(summary.total)
    expect(segments.map((segment) => segment.key)).toContain('escalated')
  })

  test('pressure points rank institutions by overdue count then open volume', () => {
    const points = buildPressurePoints(summary)
    expect(points.map((point) => point.label)).toEqual([
      'North College',
      'Central College',
      'South College',
    ])
    expect(points[0].beyond).toBe(3)
  })

  test('change feed merges overlaps and escalations into one recent stream', () => {
    const events = buildChangeFeed(summary)
    expect(events.map((event) => event.type)).toEqual(['escalation', 'overlap'])
    expect(events[0].title).toContain('CASE-003')
    expect(events[1].detail).toContain('North College')
    expect(buildChangeFeed(summary, 1)).toHaveLength(1)
  })
})
