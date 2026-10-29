import { describe, expect, test } from 'bun:test'
import { CASE_STATUS } from '@casesync/config'
import {
  addToStatusCounts,
  emptyStatusCounts,
  isBeyondTimeline,
  withOpen,
} from '#/lib/case-metrics'

const NOW = new Date('2026-10-29T12:00:00.000Z')

describe('case metric helpers', () => {
  test('counts statuses, unassigned work and overdue cases', () => {
    const counts = emptyStatusCounts()
    addToStatusCounts(
      counts,
      {
        status: CASE_STATUS.REOPENED,
        expectedDisposalAt: new Date('2026-10-28T00:00:00.000Z'),
        isUnassigned: true,
      },
      NOW,
    )
    addToStatusCounts(
      counts,
      {
        status: CASE_STATUS.DISPOSED,
        expectedDisposalAt: new Date('2026-10-01T00:00:00.000Z'),
      },
      NOW,
    )

    expect(counts).toMatchObject({
      total: 2,
      reopened: 1,
      unassigned: 1,
      disposed: 1,
      beyondTimelines: 1,
    })
    expect(withOpen(counts).open).toBe(1)
  })

  test('does not mark disposed or on-time cases as beyond timeline', () => {
    expect(
      isBeyondTimeline(
        { status: CASE_STATUS.DISPOSED, expectedDisposalAt: new Date('2026-10-01') },
        NOW,
      ),
    ).toBe(false)
    expect(
      isBeyondTimeline(
        { status: CASE_STATUS.ASSIGNED, expectedDisposalAt: new Date('2026-11-01') },
        NOW,
      ),
    ).toBe(false)
  })
})
