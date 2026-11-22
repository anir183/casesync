import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ResolutionLoop } from '../src/components/shared/resolution-loop'

afterEach(() => {
  cleanup()
})

describe('resolution loop presentation', () => {
  test('centers numbered steps and optional sublabels', () => {
    render(<ResolutionLoop status="RECEIVED" audience="staff" />)

    const lifecycle = screen.getByRole('list', { name: 'Complaint lifecycle' })
    const steps = Array.from(lifecycle.querySelectorAll('li'))
    expect(steps).toHaveLength(7)
    for (const step of steps) {
      expect(step.className).toContain('items-center')
      expect(step.className).toContain('justify-center')
      expect(step.className).toContain('text-center')
    }

    const reopen = steps[5]
    expect(reopen?.textContent).toContain('Reopen')
    expect(reopen?.textContent).toContain('Optional')
  })
})
