import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { CASE_STATUS } from '@casesync/config'
import { cleanup, render, screen } from '@testing-library/react'
import type { CaseListItem } from '../src/features/cases/api'
import { useDashboardAttention } from '../src/features/dashboard/use-dashboard-attention'

const storageKey = 'casesync:dashboard:last-seen:user-1'

const item: CaseListItem = {
  id: 'case-1',
  caseNumber: 'CASE-001',
  institutionId: 'institution-1',
  status: CASE_STATUS.ASSIGNED,
  receivedAt: '2026-11-01T09:00:00.000Z',
  lastActionAt: '2026-11-18T09:00:00.000Z',
}

function Probe() {
  const { newCount } = useDashboardAttention({ userId: 'user-1', items: [item] })
  return <p>{newCount} new</p>
}

describe('session-local dashboard attention', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(cleanup)

  test('marks newer items and advances the baseline when the surface unmounts', () => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ items: { 'case-1': Date.parse('2026-11-17T09:00:00.000Z') } }),
    )

    const first = render(<Probe />)
    expect(screen.getByText('1 new')).toBeDefined()

    first.unmount()
    const stored = JSON.parse(window.sessionStorage.getItem(storageKey) ?? '{}')
    expect(stored.items['case-1']).toBe(Date.parse(item.lastActionAt ?? ''))

    render(<Probe />)
    expect(screen.getByText('0 new')).toBeDefined()
  })

  test('does not mark every item new on a first visit', () => {
    render(<Probe />)
    expect(screen.getByText('0 new')).toBeDefined()
  })
})
