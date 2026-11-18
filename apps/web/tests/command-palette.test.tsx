import { afterEach, describe, expect, mock, test } from 'bun:test'
import { ROLES } from '@casesync/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

let activeRole: string | undefined

mock.module('#/features/cases/api', () => ({
  useCases: () => ({ data: { items: [] }, isFetching: false }),
}))
mock.module('#/features/institutions/api', () => ({
  useInstitutions: () => ({ data: { items: [] }, isFetching: false }),
}))
mock.module('#/features/overlaps/api', () => ({
  overlapKeys: { list: (filters: unknown) => ['overlaps', 'list', filters] },
  fetchOverlaps: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 5 }),
}))

const { CommandPalette } = await import('../src/components/layout/command-palette')

afterEach(cleanup)

function LocationProbe() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}</p>
}

function renderPalette(role?: string) {
  activeRole = role
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
        <CommandPalette open onClose={() => {}} role={activeRole} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('command palette', () => {
  test('leads with role-appropriate actions and navigates with Enter', () => {
    renderPalette(ROLES.ADMIN)

    expect(screen.getByRole('button', { name: /New case/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /New institution/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Dashboard/ })).toBeDefined()
    expect(screen.getByTestId('location').textContent).toBe('/dashboard')

    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search or jump to' }), {
      key: 'Enter',
    })

    expect(screen.getByTestId('location').textContent).toBe('/cases/new')
  })

  test('hides create actions from read-only roles', () => {
    renderPalette(ROLES.VIEWER)

    expect(screen.queryByRole('button', { name: /New case/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /New institution/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Dashboard/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Audit log/ })).toBeDefined()
  })

  test('arrow keys move the active result', () => {
    renderPalette(ROLES.ADMIN)
    const input = screen.getByRole('combobox', { name: 'Search or jump to' })
    const first = screen.getByRole('button', { name: /New case/ })
    const second = screen.getByRole('button', { name: /New institution/ })

    expect(first.getAttribute('aria-current')).toBe('true')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(second.getAttribute('aria-current')).toBe('true')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(first.getAttribute('aria-current')).toBe('true')
  })
})
