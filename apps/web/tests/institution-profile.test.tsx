import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { CaseListItem } from '../src/features/cases/api'
import type { Institution, InstitutionCaseSummary } from '../src/features/institutions/api'
import { InstitutionDetailHeader } from '../src/features/institutions/components/institution-detail-header'
import {
  InstitutionCaseHistory,
  InstitutionHealthSignals,
  InstitutionIdentityCard,
} from '../src/features/institutions/components/institution-detail-sections'

afterEach(cleanup)

const institution: Institution = {
  id: 'institution-1',
  name: 'Delhi Institute of Technology',
  aictePermanentId: 'AICTE-1-999999',
  aliases: ['Delhi Institute of Technolgy', 'DIT'],
  address: 'New Delhi',
  regionId: 'region-1',
  regionName: 'NORTH',
  verified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

const summary: InstitutionCaseSummary = {
  total: 14,
  open: 8,
  pending: 2,
  unassigned: 1,
  assigned: 1,
  underProcess: 4,
  disposed: 4,
  transferred: 1,
  escalated: 1,
  reopened: 1,
  beyondTimelines: 2,
}

const cases: CaseListItem[] = [
  {
    id: 'case-1',
    caseNumber: 'PGRC-2026-001',
    institutionId: 'institution-1',
    bureauId: 'bureau-1',
    bureauName: 'PGRC',
    regionName: 'NORTH',
    status: 'UNDER_PROCESS',
    receivedAt: '2026-11-01T09:00:00.000Z',
  },
  {
    id: 'case-2',
    caseNumber: 'RB-2026-001',
    institutionId: 'institution-1',
    bureauId: 'bureau-2',
    bureauName: 'RB',
    regionName: 'NORTH',
    status: 'ESCALATED',
    receivedAt: '2026-11-02T09:00:00.000Z',
  },
]

describe('institution detail header', () => {
  test('keeps identity, verification, and role actions in one sticky summary', () => {
    render(
      <MemoryRouter>
        <InstitutionDetailHeader
          institution={institution}
          canWrite
          canRegister
          isUpdating={false}
          onToggleVerified={() => {}}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Delhi Institute of Technology' })).toBeDefined()
    expect(screen.getByText('Verified')).toBeDefined()
    expect(screen.getByText('AICTE-1-999999')).toBeDefined()
    expect(screen.getByRole('link', { name: '← Back to institutions' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Edit institution' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Register case' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Mark unverified' })).toBeDefined()
  })
})

describe('institution health signals', () => {
  test('summarises workload with readable, non-colour-only cues', () => {
    render(<InstitutionHealthSignals summary={summary} total={14} />)

    expect(screen.getByRole('region', { name: 'Institution case health' })).toBeDefined()
    expect(screen.getByText('Total cases')).toBeDefined()
    expect(screen.getByText('Beyond timeline')).toBeDefined()
    expect(screen.getByText('Needs attention')).toBeDefined()
    expect(screen.getByText('Unassigned')).toBeDefined()
    expect(screen.getByText('Needs owner')).toBeDefined()
  })
})

describe('institution identity card', () => {
  test('shows alias context as duplicate-detection metadata', () => {
    render(<InstitutionIdentityCard institution={institution} />)

    expect(screen.getByRole('heading', { name: 'Identity and aliases' })).toBeDefined()
    expect(screen.getByRole('list', { name: 'Institution aliases' })).toBeDefined()
    expect(screen.getByText('Delhi Institute of Technolgy')).toBeDefined()
    expect(
      screen.getByText(
        /Alias names support duplicate detection; they do not create separate records/,
      ),
    ).toBeDefined()
  })
})

describe('institution case history', () => {
  test('groups the current page by bureau and keeps the scoped case table', () => {
    render(
      <MemoryRouter>
        <InstitutionCaseHistory
          cases={cases}
          total={14}
          page={1}
          pageSize={20}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Cross-bureau history' })).toBeDefined()
    expect(screen.getByRole('list', { name: 'Bureaus on this page' })).toBeDefined()
    expect(screen.getByText('PGRC · 1')).toBeDefined()
    expect(screen.getByText('RB · 1')).toBeDefined()
    expect(screen.getByRole('region', { name: 'Institution case history' })).toBeDefined()
    expect(screen.getByRole('table')).toBeDefined()
  })
})
