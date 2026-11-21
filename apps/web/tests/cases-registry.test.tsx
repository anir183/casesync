import { afterEach, describe, expect, mock, test } from 'bun:test'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { CaseListItem } from '../src/features/cases/api'
import { useCaseDensity } from '../src/features/cases/case-density'
import { CaseFilterChips } from '../src/features/cases/components/case-filter-chips'
import { CaseRegistryToolbar } from '../src/features/cases/components/case-registry-toolbar'
import { CaseTable } from '../src/features/cases/components/case-table'
import { buildSelectedCasesCsv, escapeCsvValue } from '../src/features/cases/export'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

const cases: CaseListItem[] = [
  {
    id: 'case-1',
    caseNumber: 'PGRC-2026-001',
    institutionId: 'institution-1',
    institutionName: 'Delhi Institute of Technology',
    status: 'ESCALATED',
    receivedAt: '2026-11-01T09:00:00.000Z',
    officerName: 'A. Officer',
  },
  {
    id: 'case-2',
    caseNumber: 'RB-2026-002',
    institutionId: 'institution-2',
    institutionName: 'Rajasthan Board',
    status: 'RECEIVED',
    receivedAt: '2026-11-02T09:00:00.000Z',
  },
]

describe('case registry filters and toolbar', () => {
  test('active chips target one filter and ignore pagination', () => {
    const onRemove = mock((_key: string) => {})
    render(
      <CaseFilterChips
        filters={{ q: 'fees', status: 'ESCALATED', page: 3, pageSize: 50 }}
        valueLabels={{ q: 'fees' }}
        onRemove={onRemove}
      />,
    )

    expect(screen.getByRole('button', { name: 'Remove Search filter' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Remove Status filter' })).toBeDefined()
    expect(screen.queryByRole('button', { name: /Remove Page/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Status filter' }))
    expect(onRemove).toHaveBeenCalledWith('status')
  })

  test('toolbar keeps export and register labels while exposing density and selection state', () => {
    const onDensityChange = mock((_density: string) => {})
    render(
      <MemoryRouter>
        <CaseRegistryToolbar
          savedView="all"
          savedViews={[{ id: 'all', label: 'All cases' }]}
          onSavedViewChange={() => {}}
          total={5}
          isLoading={false}
          selectedCount={2}
          canRegister
          isExporting={false}
          density="comfortable"
          onExport={() => {}}
          onExportSelected={() => {}}
          onDensityChange={onDensityChange}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('5 total')).toBeDefined()
    expect(screen.getByText('2 selected')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Register case' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Use compact rows' }))
    expect(onDensityChange).toHaveBeenCalledWith('compact')
  })

  test('density preference persists across remounts', () => {
    const first = renderHook(() => useCaseDensity())
    expect(first.result.current.density).toBe('comfortable')

    act(() => first.result.current.setDensity('compact'))
    expect(window.localStorage.getItem('casesync:cases:density')).toBe('compact')
    first.unmount()

    const second = renderHook(() => useCaseDensity())
    expect(second.result.current.density).toBe('compact')
  })
})

describe('case registry table', () => {
  test('selection is controlled per page and exposes an indeterminate select-all', () => {
    const onToggleCase = mock((_id: string, _selected: boolean) => {})
    const onTogglePage = mock((_selected: boolean) => {})
    const { rerender } = render(
      <MemoryRouter>
        <CaseTable
          cases={cases}
          density="comfortable"
          selectedIds={new Set(['case-1'])}
          onToggleCase={onToggleCase}
          onTogglePage={onTogglePage}
        />
      </MemoryRouter>,
    )

    const selectAll = screen.getByRole('checkbox', {
      name: 'Select all cases on this page',
    }) as HTMLInputElement
    expect(selectAll.indeterminate).toBe(true)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select RB-2026-002' }))
    expect(onToggleCase).toHaveBeenCalledWith('case-2', true)

    fireEvent.click(selectAll)
    expect(onTogglePage).toHaveBeenCalledWith(true)

    rerender(
      <MemoryRouter>
        <CaseTable
          cases={cases}
          density="compact"
          selectedIds={new Set(['case-1', 'case-2'])}
          onToggleCase={onToggleCase}
          onTogglePage={onTogglePage}
        />
      </MemoryRouter>,
    )
    expect(selectAll.checked).toBe(true)
    expect(selectAll.indeterminate).toBe(false)
    expect(screen.getByLabelText('Case registry table').getAttribute('data-density')).toBe(
      'compact',
    )
  })

  test('row actions are keyboard reachable and copy feedback is announced', async () => {
    const writeText = mock((_value: string) => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(
      <MemoryRouter>
        <CaseTable cases={[cases[0] as CaseListItem]} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Open case PGRC-2026-001' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'View institution for PGRC-2026-001' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Copy ID for PGRC-2026-001' }))
    expect(writeText).toHaveBeenCalledWith('PGRC-2026-001')
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('Copied case ID PGRC-2026-001')
    })
  })
})

describe('selected-row CSV', () => {
  test('escapes commas, quotes, and newlines', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"')
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"')

    const csv = buildSelectedCasesCsv([
      {
        ...(cases[0] as CaseListItem),
        caseNumber: 'PGRC-2026,001',
        subject: 'Subject with "quotes"\nand a newline',
      },
    ])

    expect(csv.startsWith('Case ID,Subject,Institution,')).toBe(true)
    expect(csv).toContain('"PGRC-2026,001"')
    expect(csv).toContain('"Subject with ""quotes""\nand a newline"')
  })
})
