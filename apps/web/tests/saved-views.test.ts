import { describe, expect, test } from 'bun:test'
import { CASE_STATUS } from '@casesync/config'
import { caseViewForFilters } from '../src/features/cases/saved-views'
import { overlapViewForFilters } from '../src/features/overlaps/saved-views'

describe('saved views', () => {
  test('case registry presets match their filters', () => {
    expect(caseViewForFilters({})).toBe('all')
    expect(caseViewForFilters({ status: CASE_STATUS.ESCALATED })).toBe('escalated')
    expect(caseViewForFilters({ status: CASE_STATUS.REOPENED, page: 2 })).toBe('reopened')
    expect(caseViewForFilters({ bureauId: 'bureau-1' })).toBe('custom')
  })

  test('overlap queue presets match their filters', () => {
    expect(
      overlapViewForFilters({ status: 'PENDING', mergeStatus: 'candidate,manual_review' }),
    ).toBe('awaiting-review')
    expect(
      overlapViewForFilters({ status: 'CONFIRMED', mergeStatus: 'auto_merged', pageSize: 10 }),
    ).toBe('auto-merged')
    expect(overlapViewForFilters({ status: 'PENDING', bureauId: 'bureau-1' })).toBe('custom')
  })
})
