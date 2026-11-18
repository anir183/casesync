import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { RouteErrorBoundary } from '../src/components/layout/route-error-boundary'

afterEach(cleanup)

function ThrowRoute(): never {
  throw new Error('Developer-only internals must not be shown')
}

function renderErrorBranch(initialEntry: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: <ThrowRoute /> },
          { path: 'dashboard', element: <p>Dashboard home</p> },
          { path: 'portal/dashboard', element: <ThrowRoute /> },
          { path: 'portal/login', element: <p>Sign in home</p> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  )
  return render(<RouterProvider router={router} />)
}

describe('route error boundary', () => {
  test('shows a branded fallback and recovers to the dashboard', () => {
    renderErrorBranch('/')

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeDefined()
    expect(screen.queryByText('Developer-only internals must not be shown')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Return to dashboard' }))
    expect(screen.getByText('Dashboard home')).toBeDefined()
  })

  test('offers a sign-in recovery action on public branches', () => {
    renderErrorBranch('/portal/dashboard')

    expect(screen.getByRole('button', { name: 'Go to sign in' })).toBeDefined()
  })
})
