import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from '../src/components/theme/theme-provider'
import { ThemeToggle } from '../src/components/theme/theme-toggle'

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.classList.remove('dark')
  document.documentElement.removeAttribute('data-theme')
})

afterEach(cleanup)

describe('theme controls', () => {
  test('applies and persists an explicit theme choice', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('casesync-theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Dark theme' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })
})
