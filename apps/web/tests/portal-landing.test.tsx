import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PortalLandingContent } from '../src/features/portal/pages/portal-landing-page'

afterEach(cleanup)

function renderLanding(isComplainant = false) {
  return render(
    <MemoryRouter>
      <PortalLandingContent isComplainant={isComplainant} />
    </MemoryRouter>,
  )
}

describe('portal landing', () => {
  test('leads with one action and keeps tracking, steps, privacy, and disclosure clear', () => {
    renderLanding()

    expect(screen.getByText('AICTE public complaints')).toBeDefined()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Raise a concern. Follow it to resolution.',
      }),
    ).toBeDefined()
    expect(screen.getByRole('link', { name: /File a complaint/ }).getAttribute('href')).toBe(
      '/portal/signup',
    )
    expect(screen.getByRole('link', { name: 'Track a complaint' }).getAttribute('href')).toBe(
      '#track-complaint',
    )

    expect(screen.getByRole('form', { name: 'Track complaint' })).toBeDefined()
    expect(screen.getByLabelText('Complaint number')).toBeDefined()
    expect(screen.getByLabelText('Email address')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Track complaint' })).toBeDefined()

    expect(screen.getByRole('heading', { name: 'Three steps, start to finish' })).toBeDefined()
    for (const step of ['1. Verify', '2. File', '3. Follow']) {
      expect(screen.getByText(step)).toBeDefined()
    }
    expect(screen.getByRole('heading', { name: 'Privacy comes first' })).toBeDefined()

    const faq = screen.getByText('What happens after I file?').closest('details')
    expect(faq?.open).toBe(false)
    fireEvent.click(screen.getByText('What happens after I file?'))
    expect(faq?.open).toBe(true)
  })

  test('signed-in complainants get the dashboard action instead of signup', () => {
    renderLanding(true)

    expect(screen.getByRole('link', { name: /Go to my complaints/ }).getAttribute('href')).toBe(
      '/portal/dashboard',
    )
    expect(screen.queryByRole('link', { name: /File a complaint/ })).toBeNull()
    expect(screen.getByRole('form', { name: 'Track complaint' })).toBeDefined()
  })
})
