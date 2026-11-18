import { describe, expect, test } from 'bun:test'
import { CASE_STATUS } from '@casesync/config'
import type { CaseListItem } from '../src/features/cases/api'
import { ATTENTION_BAND_LABELS, deriveAttention } from '../src/features/dashboard/attention'
import { getFreshness } from '../src/features/dashboard/freshness'

function caseItem(overrides: Partial<CaseListItem>): CaseListItem {
  return {
    id: 'case-1',
    caseNumber: 'CASE-001',
    institutionId: 'institution-1',
    status: CASE_STATUS.ASSIGNED,
    receivedAt: '2026-11-01T09:00:00.000Z',
    ...overrides,
  }
}

describe('dashboard urgency derivation', () => {
  const now = Date.parse('2026-11-18T12:00:00.000Z')

  test('bands and ranks overdue, escalated, due-soon, and watching cases', () => {
    const entries = deriveAttention(
      [
        caseItem({
          id: 'watching',
          nextActionDueAt: '2026-12-01T12:00:00.000Z',
        }),
        caseItem({
          id: 'soon',
          nextActionDueAt: '2026-11-20T12:00:00.000Z',
        }),
        caseItem({
          id: 'overdue',
          nextActionDueAt: '2026-11-18T09:00:00.000Z',
        }),
        caseItem({
          id: 'escalated',
          status: CASE_STATUS.ESCALATED,
          nextActionDueAt: '2026-12-15T12:00:00.000Z',
        }),
      ],
      now,
      new Set(['overdue']),
    )

    expect(entries.map((entry) => entry.item.id)).toEqual([
      'escalated',
      'overdue',
      'soon',
      'watching',
    ])
    expect(entries.map((entry) => ATTENTION_BAND_LABELS[entry.band])).toEqual([
      'Due now',
      'Due now',
      'Due soon',
      'Watching',
    ])
    expect(entries[1].countdown).toBe('3h overdue')
    expect(entries[1].reason).toBe('Assigned')
    expect(entries[1].isNew).toBe(true)
  })

  test('derives friendly reasons from case status', () => {
    const entries = deriveAttention(
      [
        caseItem({ id: 'a', status: CASE_STATUS.AWAITING_COMPLAINANT }),
        caseItem({ id: 'b', status: CASE_STATUS.TRANSFERRED }),
        caseItem({ id: 'c', status: CASE_STATUS.REOPENED }),
      ],
      now,
    )

    expect(entries.map((entry) => entry.reason)).toEqual([
      'Reopened',
      'Awaiting complainant',
      'Transfer pending',
    ])
  })
})

describe('dashboard freshness derivation', () => {
  const now = Date.parse('2026-11-18T12:00:00.000Z')

  test('reports live, stale, and waiting states', () => {
    expect(getFreshness('2026-11-18T11:59:00.000Z', now).state).toBe('live')
    expect(getFreshness('2026-11-18T11:55:00.000Z', now).text).toContain('Stale')
    expect(getFreshness(undefined, now).state).toBe('waiting')
  })
})
