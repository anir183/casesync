import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { FormEvent } from 'react'
import type { ReportFilters } from '../src/features/reports/api'
import { ReportControlBand } from '../src/features/reports/components/report-control-band'
import {
  cleanReportFilters,
  readReportFilters,
  removeReportFilter,
  reportFiltersToParams,
} from '../src/features/reports/filters'
import { reportViewForFilters } from '../src/features/reports/saved-views'

afterEach(cleanup)

const options = {
  statusOptions: [{ value: 'ESCALATED', label: 'Escalated' }],
  bureauOptions: [{ value: 'bureau-1', label: 'Bureau One' }],
  regionOptions: [{ value: 'north', label: 'Northern Region' }],
  categoryOptions: [{ value: 'CAT-1', label: 'Water' }],
}

describe('report control band', () => {
  test('keeps saved views, filters, and active chips in a named sticky region', () => {
    const onDraftChange = mock((_key: keyof ReportFilters, _value: string) => {})
    const onSubmit = mock((_event: FormEvent<HTMLFormElement>) => {})
    const onReset = mock(() => {})
    const onSavedViewChange = mock((_id: string) => {})
    const onFilterRemove = mock((_key: keyof ReportFilters) => {})

    render(
      <ReportControlBand
        draft={{ dateFrom: '2026-11-01' }}
        appliedFilters={{ status: 'ESCALATED', regionId: 'north' }}
        activeView="escalated"
        resultCount={12}
        statusOptions={options.statusOptions}
        bureauOptions={options.bureauOptions}
        regionOptions={options.regionOptions}
        categoryOptions={options.categoryOptions}
        onDraftChange={onDraftChange}
        onSubmit={onSubmit}
        onReset={onReset}
        onSavedViewChange={onSavedViewChange}
        onFilterRemove={onFilterRemove}
      />,
    )

    expect(screen.getByRole('region', { name: 'Reports workbench' })).toBeDefined()
    expect(screen.getByRole('search', { name: 'Reports filters' })).toBeDefined()
    expect(screen.getByRole('combobox', { name: 'Saved views' })).toBeDefined()
    expect(screen.getByText('12 cases in scope · 2 active filters')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Remove Status filter' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Remove Region filter' })).toBeDefined()

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ESCALATED' } })
    expect(onDraftChange).toHaveBeenCalledWith('status', 'ESCALATED')

    fireEvent.submit(screen.getByRole('search', { name: 'Reports filters' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Remove Status filter' }))
    expect(onFilterRemove).toHaveBeenCalledWith('status')

    fireEvent.change(screen.getByRole('combobox', { name: 'Saved views' }), {
      target: { value: 'reopened' },
    })
    expect(onSavedViewChange).toHaveBeenCalledWith('reopened')
  })

  test('announces loading without inventing a total', () => {
    render(
      <ReportControlBand
        draft={{}}
        appliedFilters={{}}
        activeView="all"
        isLoading
        statusOptions={[]}
        bureauOptions={[]}
        regionOptions={[]}
        categoryOptions={[]}
        onDraftChange={() => {}}
        onSubmit={() => {}}
        onReset={() => {}}
        onSavedViewChange={() => {}}
        onFilterRemove={() => {}}
      />,
    )

    expect(screen.getByText('Loading report totals… · all reports in scope')).toBeDefined()
    expect(screen.queryByRole('button', { name: /Remove .* filter/ })).toBeNull()
  })
})

describe('report filter helpers', () => {
  test('saved views match exact server filter signatures', () => {
    expect(reportViewForFilters({})).toBe('all')
    expect(reportViewForFilters({ status: 'ESCALATED' })).toBe('escalated')
    expect(reportViewForFilters({ status: 'REOPENED' })).toBe('reopened')
    expect(reportViewForFilters({ status: 'DISPOSED' })).toBe('disposed')
    expect(reportViewForFilters({ status: 'ESCALATED', dateFrom: '2026-11-01' })).toBe('custom')
  })

  test('URL filters round-trip and chips remove only the chosen key', () => {
    const filters = cleanReportFilters({
      dateFrom: '2026-11-01',
      status: 'ESCALATED',
      regionId: '',
    })
    const params = reportFiltersToParams(filters)

    expect(params.get('dateFrom')).toBe('2026-11-01')
    expect(params.get('status')).toBe('ESCALATED')
    expect(params.has('regionId')).toBe(false)
    expect(readReportFilters(params)).toEqual(filters)
    expect(removeReportFilter(filters, 'status')).toEqual({ dateFrom: '2026-11-01' })
  })
})
