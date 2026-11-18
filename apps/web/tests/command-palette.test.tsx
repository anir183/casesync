import { afterEach, describe, expect, mock, test } from 'bun:test'
import { ROLES } from '@casesync/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

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

const { CommandPalette, InlineCommandSearch } = await import(
  '../src/components/layout/command-palette'
)

afterEach(cleanup)

function LocationProbe() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}</p>
}

function withProviders(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
        {children}
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderPalette(role?: string) {
  return withProviders(<CommandPalette open onClose={() => {}} role={role} />)
}

function renderInline(role: string | undefined, onClose: () => void) {
  return withProviders(<InlineCommandSearch role={role} open onOpen={() => {}} onClose={onClose} />)
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

describe('inline command search', () => {
  test('keeps the bar input expanded and closes on Escape', () => {
    const onClose = mock(() => {})
    renderInline(ROLES.ADMIN, onClose)

    const input = screen.getByRole('combobox', { name: 'Search or jump to' })
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(input.getAttribute('aria-controls')).toBe('inline-command-results')
    expect(document.getElementById('inline-command-results')).not.toBeNull()
    expect(screen.getByRole('button', { name: /New case/ })).toBeDefined()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  test('uses the same role gating as the modal', () => {
    renderInline(ROLES.VIEWER, () => {})

    expect(screen.queryByRole('button', { name: /New case/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Dashboard/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Audit log/ })).toBeDefined()
  })
})
