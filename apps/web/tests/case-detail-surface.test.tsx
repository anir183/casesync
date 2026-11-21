import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { CaseDetail } from '../src/features/cases/api'
import { CaseDetailHeader } from '../src/features/cases/components/case-detail-header'
import { Timeline } from '../src/features/cases/components/case-detail-sections'
import {
  type CaseDetailTab,
  CaseDetailTabs,
} from '../src/features/cases/components/case-detail-tabs'

afterEach(cleanup)

const detail: CaseDetail = {
  id: 'case-1',
  caseNumber: 'PGRC-2026-001',
  institutionId: 'institution-1',
  institutionName: 'Delhi Institute of Technology',
  bureauId: 'bureau-1',
  bureauName: 'PGRC',
  regionId: 'region-1',
  regionName: 'Delhi',
  status: 'UNDER_PROCESS',
  receivedAt: '2026-11-01T09:00:00.000Z',
  expectedDisposalAt: '2026-12-01T09:00:00.000Z',
  nextAction: 'Collect feedback',
  nextActionDueAt: '2026-11-20T09:00:00.000Z',
  officerName: 'A. Officer',
  slaDays: 30,
  institution: { id: 'institution-1', name: 'Delhi Institute of Technology' },
  bureau: { id: 'bureau-1', name: 'PGRC', code: 'PGRC' },
  region: { id: 'region-1', name: 'Delhi', code: 'DEL' },
  assignments: [],
  relatedCases: [],
  actions: [
    {
      _id: 'action-1',
      actorId: 'user-1',
      actorName: 'Intake desk',
      actionType: 'REGISTERED',
      createdAt: '2026-11-01T09:00:00.000Z',
    },
    {
      _id: 'action-2',
      actorId: 'user-2',
      actorName: 'Reviewer',
      actionType: 'STATUS_CHANGE',
      fromStatus: 'RECEIVED',
      toStatus: 'UNDER_PROCESS',
      bureauFromName: 'Intake',
      bureauToName: 'PGRC',
      remarks: 'Needs senior review',
      createdAt: '2026-11-01T11:30:00.000Z',
    },
    {
      _id: 'action-3',
      actorId: 'user-3',
      actionType: 'REMARK',
      remarks: 'Sent acknowledgment',
      createdAt: '2026-11-02T10:00:00.000Z',
    },
  ],
}

describe('case detail header', () => {
  test('shows identity, owner, and next-action cue in one summary', () => {
    render(
      <MemoryRouter>
        <CaseDetailHeader item={detail} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'PGRC-2026-001' })).toBeDefined()
    expect(screen.getByText('Officer: A. Officer')).toBeDefined()
    expect(screen.getByRole('link', { name: '← Back to case registry' })).toBeDefined()
    expect(
      screen.getByRole('link', { name: 'Delhi Institute of Technology' }).getAttribute('href'),
    ).toBe('/institutions/institution-1')
    expect(screen.getByText(/Collect feedback · Due/)).toBeDefined()
    expect(screen.getByText('PGRC')).toBeDefined()
    expect(screen.getByText('Delhi')).toBeDefined()
  })
})

describe('case detail tabs', () => {
  test('exposes the five case sections with tab roles and arrow-key navigation', () => {
    function Harness() {
      const [value, setValue] = useState<CaseDetailTab>('overview')
      return (
        <CaseDetailTabs
          value={value}
          onValueChange={setValue}
          content={{
            overview: <p>Overview panel</p>,
            conversation: <p>Conversation panel</p>,
            documents: <p>Documents panel</p>,
            timeline: <p>Timeline panel</p>,
            related: <p>Related panel</p>,
          }}
        />
      )
    }

    render(<Harness />)

    expect(screen.getByRole('tablist', { name: 'Case sections' })).toBeDefined()
    expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByRole('tab')).toHaveLength(5)

    const overview = screen.getByRole('tab', { name: 'Overview' })
    overview.focus()
    fireEvent.keyDown(overview, { key: 'ArrowRight' })

    const conversation = screen.getByRole('tab', { name: 'Conversation' })
    expect(document.activeElement).toBe(conversation)
    expect(conversation.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Conversation panel')).toBeDefined()
  })
})

describe('case timeline', () => {
  test('groups append-only entries by day with actor, transition, and remarks', () => {
    render(<Timeline item={detail} />)

    expect(screen.getByRole('list', { name: 'Case action history' })).toBeDefined()
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(2)
    expect(screen.getByText('By Intake desk')).toBeDefined()
    expect(screen.getByText('By Reviewer')).toBeDefined()
    expect(screen.getByText('RECEIVED → UNDER PROCESS')).toBeDefined()
    expect(screen.getByText('Bureau: Intake → PGRC')).toBeDefined()
    expect(screen.getByText('Needs senior review')).toBeDefined()
    expect(screen.getByText('Sent acknowledgment')).toBeDefined()

    const remarks = screen.getAllByText(/Needs senior review|Sent acknowledgment/)
    expect(remarks.length).toBe(2)
  })
})
