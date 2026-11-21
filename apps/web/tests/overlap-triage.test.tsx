import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Overlap } from '../src/features/overlaps/api'
import { OverlapCompareHeader } from '../src/features/overlaps/components/overlap-compare-header'
import { OverlapTriageCard } from '../src/features/overlaps/components/overlap-triage-card'
import { useOverlapTriageShortcuts } from '../src/features/overlaps/overlap-triage-shortcuts'

afterEach(cleanup)

const overlap: Overlap = {
  id: 'overlap-1',
  matchType: 'INSTITUTION_EXACT_ID',
  confidenceScore: 0.86,
  reason: 'Both cases name the same institution and fees issue.',
  reviewStatus: 'PENDING',
  mergeStatus: 'manual_review',
  reMergeSuppressed: false,
  createdAt: '2026-11-01T09:00:00.000Z',
  institution: {
    id: 'institution-1',
    name: 'Delhi Institute of Technology',
    aictePermanentId: 'AICTE-1-999999',
  },
  assessment: {
    id: 'assessment-1',
    status: 'ASSESSED',
    relationshipChoice: 'likely_same_issue',
    coordinationReviewNoul: 0.74,
    confidence: 0.9,
  },
  matchSignals: {
    textSimilarity: 0.92,
    institutionMatch: 1,
    regionMatch: 0.8,
  },
  cases: [
    {
      id: 'case-1',
      caseNumber: 'PGRC-2026-001',
      status: 'UNDER_PROCESS',
      bureauName: 'PGRC',
    },
    {
      id: 'case-2',
      caseNumber: 'RB-2026-001',
      status: 'RECEIVED',
      bureauName: 'RB',
    },
  ],
}

describe('overlap triage card', () => {
  test('promotes score and evidence while preserving review navigation', () => {
    render(
      <MemoryRouter>
        <OverlapTriageCard
          overlap={overlap}
          position={0}
          isActive
          canReview
          onActivate={() => {}}
          onQuickReview={() => {}}
        />
      </MemoryRouter>,
    )

    const article = screen.getByRole('article', {
      name: 'Overlap for Delhi Institute of Technology',
    })
    expect(article.getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('link', { name: 'Review' }).getAttribute('href')).toBe(
      '/overlaps/overlap-1',
    )
    expect(screen.getByRole('list', { name: 'Match evidence' })).toBeDefined()
    expect(screen.getByText('Institution ID match · 100%')).toBeDefined()
    expect(screen.getByText('74%')).toBeDefined()
    expect(screen.getByText('86%')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Confirm this overlap' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Dismiss this overlap' })).toBeDefined()
  })

  test('hides quick decisions from read-only reviewers', () => {
    render(
      <MemoryRouter>
        <OverlapTriageCard overlap={overlap} canReview={false} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Confirm this overlap' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Dismiss this overlap' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Review' })).toBeDefined()
  })
})

describe('overlap triage shortcuts', () => {
  test('moves between rows, opens decisions, and ignores typing or dialogs', () => {
    const onActiveChange = mock((_index: number) => {})
    const onConfirm = mock(() => {})
    const onDismiss = mock(() => {})

    const { rerender } = renderHook(
      ({ activeIndex }) =>
        useOverlapTriageShortcuts({
          itemCount: 3,
          activeIndex,
          canDecide: true,
          dialogOpen: false,
          onActiveChange,
          onConfirm,
          onDismiss,
        }),
      { initialProps: { activeIndex: 0 } },
    )

    fireEvent.keyDown(window, { key: 'j' })
    expect(onActiveChange).toHaveBeenCalledWith(1)

    rerender({ activeIndex: 1 })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(onActiveChange).toHaveBeenCalledWith(0)

    fireEvent.keyDown(window, { key: 'c' })
    fireEvent.keyDown(window, { key: 'd' })
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: 'c' })
    expect(onConfirm).toHaveBeenCalledTimes(1)
    input.remove()

    const dialog = document.createElement('dialog')
    dialog.setAttribute('open', '')
    document.body.appendChild(dialog)
    fireEvent.keyDown(window, { key: 'd' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
    dialog.remove()
  })
})

describe('overlap compare header', () => {
  test('keeps identity, scores, and a jump to the decision card', () => {
    render(
      <MemoryRouter>
        <OverlapCompareHeader overlap={overlap} showDecisionLink />
      </MemoryRouter>,
    )

    expect(screen.getByRole('region', { name: 'Overlap comparison' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Delhi Institute of Technology' })).toBeDefined()
    expect(screen.getByRole('link', { name: '← Back to overlap queue' }).getAttribute('href')).toBe(
      '/overlaps',
    )
    expect(screen.getByRole('link', { name: 'Go to review decision' }).getAttribute('href')).toBe(
      '#overlap-decision',
    )
    expect(screen.getByText('74%')).toBeDefined()
    expect(screen.getByText('86%')).toBeDefined()
  })
})
