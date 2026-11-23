import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { matchScore } from '../src/components/layout/command-palette'
import { Dialog } from '../src/components/ui/dialog'
import { DropdownMenu } from '../src/components/ui/dropdown-menu'
import { ErrorState } from '../src/components/ui/error-state'
import { Field } from '../src/components/ui/field'
import { FormActions } from '../src/components/ui/form-actions'
import { KpiStrip } from '../src/components/ui/kpi-strip'
import { PasswordInput } from '../src/components/ui/password-input'
import { Popover } from '../src/components/ui/popover'
import { Skeleton } from '../src/components/ui/skeleton'
import { Tabs } from '../src/components/ui/tabs'

afterEach(cleanup)

describe('shared UI primitives', () => {
  test('Field associates help and error messages with the control', () => {
    render(
      <Field
        label="Case title"
        htmlFor="case-title"
        help="Use the customer-facing name."
        error="A title is required."
        required
      >
        <input id="case-title" />
      </Field>,
    )

    const input = screen.getByRole('textbox')
    expect(input.getAttribute('aria-invalid')).toBe('true')

    const describedBy = input.getAttribute('aria-describedby')?.split(' ') ?? []
    expect(describedBy).toContain(screen.getByText('Use the customer-facing name.').id)
    expect(describedBy).toContain(screen.getByRole('alert').id)
  })

  test('PasswordInput toggles visibility with an accessible button', () => {
    render(
      <Field label="Password" htmlFor="password">
        <PasswordInput id="password" />
      </Field>,
    )

    const input = screen.getByLabelText('Password') as HTMLInputElement
    const toggle = screen.getByRole('button', { name: 'Show password' })

    expect(input.type).toBe('password')
    expect(toggle.getAttribute('aria-controls')).toBe('password')

    fireEvent.click(toggle)

    expect(input.type).toBe('text')
    expect(toggle.getAttribute('aria-label')).toBe('Hide password')

    fireEvent.click(toggle)

    expect(input.type).toBe('password')
    expect(toggle.getAttribute('aria-label')).toBe('Show password')
  })

  test('Command palette match scoring ranks exact matches before fuzzy matches', () => {
    expect(matchScore('rep', 'Reports')).toBeGreaterThan(matchScore('repotrs', 'Reports'))
    expect(matchScore('repotrs', 'Reports')).toBeGreaterThan(matchScore('zzz', 'Reports'))
    expect(matchScore('pgrc004', 'PGRC-2026-004')).toBeGreaterThan(0)
    expect(matchScore('', 'Reports')).toBe(0)
  })

  test('FormActions renders a sticky row for form controls', () => {
    render(
      <FormActions>
        <button type="submit">Save changes</button>
      </FormActions>,
    )

    const actions = screen.getByRole('button', { name: 'Save changes' }).parentElement
    expect(actions?.className).toContain('sticky')
    expect(actions?.className).toContain('bottom-0')
  })

  test('Tabs move focus and selection with arrow keys, skipping disabled tabs', () => {
    const selected: string[] = []
    render(
      <Tabs
        ariaLabel="Case sections"
        defaultValue="overview"
        items={[
          { id: 'overview', label: 'Overview', content: <p>Overview content</p> },
          { id: 'activity', label: 'Activity', content: <p>Activity content</p> },
          {
            id: 'history',
            label: 'History',
            content: <p>History content</p>,
            disabled: true,
          },
          { id: 'notes', label: 'Notes', content: <p>Notes content</p> },
        ]}
        onValueChange={(id) => selected.push(id)}
      />,
    )

    const overview = screen.getByRole('tab', { name: 'Overview' })
    overview.focus()
    fireEvent.keyDown(overview, { key: 'ArrowRight' })

    const activity = screen.getByRole('tab', { name: 'Activity' })
    expect(selected).toEqual(['activity'])
    expect(document.activeElement).toBe(activity)
    expect(activity.getAttribute('aria-selected')).toBe('true')
    expect(activity.tabIndex).toBe(0)

    fireEvent.keyDown(activity, { key: 'End' })
    const notes = screen.getByRole('tab', { name: 'Notes' })
    expect(selected).toEqual(['activity', 'notes'])
    expect(document.activeElement).toBe(notes)
    expect(screen.getByText('Notes content')).toBeDefined()
  })

  test('Dialog closes on Escape and restores focus to the opener', () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open dialog
          </button>
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            title="Edit case"
            description="Update the case details."
          >
            <button type="button">Save changes</button>
          </Dialog>
        </>
      )
    }

    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })
    opener.focus()
    fireEvent.click(opener)

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Save changes' }))

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  test('Popover closes on outside click and Escape, returning focus each time', () => {
    render(
      <Popover trigger="Open filters" ariaLabel="Filter options">
        <button type="button">Inside action</button>
      </Popover>,
    )

    const trigger = screen.getByRole('button', { name: 'Filter options' })
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Filter options' })).toBeDefined()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Inside action' }))

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog', { name: 'Filter options' })).toBeNull()
    expect(document.activeElement).toBe(trigger)

    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Filter options' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  test('DropdownMenu navigates enabled items by keyboard and reports selection', () => {
    const selected: string[] = []
    render(
      <DropdownMenu
        ariaLabel="Case actions"
        trigger="Actions"
        items={[
          {
            label: 'Rename',
            onSelect: () => selected.push('Rename'),
          },
          {
            label: 'Disabled action',
            onSelect: () => selected.push('Disabled action'),
            disabled: true,
          },
          {
            label: 'Archive',
            onSelect: () => selected.push('Archive'),
          },
        ]}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Actions' })
    fireEvent.click(trigger)

    const menu = screen.getByRole('menu', { name: 'Case actions' })
    expect(menu.className).toContain('top-full')

    const rename = screen.getByRole('menuitem', { name: 'Rename' })
    const archive = screen.getByRole('menuitem', { name: 'Archive' })
    expect(document.activeElement).toBe(rename)

    fireEvent.keyDown(rename, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(archive)

    fireEvent.keyDown(archive, { key: 'Home' })
    expect(document.activeElement).toBe(rename)

    fireEvent.keyDown(rename, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(archive)

    fireEvent.click(archive)
    expect(selected).toEqual(['Archive'])
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)

    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  test('ErrorState exposes an alert and invokes the retry action', () => {
    let retries = 0
    render(
      <ErrorState
        title="Could not load cases"
        description="Check your connection and try again."
        retry={{
          onClick: () => {
            retries += 1
          },
        }}
      />,
    )

    expect(screen.getByRole('alert')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retries).toBe(1)
  })

  test('Skeleton disables its pulse when reduced motion is requested', () => {
    render(<Skeleton aria-label="Loading row" />)

    const skeleton = screen.getByLabelText('Loading row')
    expect(skeleton.className).toContain('animate-pulse')
    expect(skeleton.className).toContain('motion-reduce:animate-none')
  })

  test('KpiStrip renders each value with tabular numerals', () => {
    render(
      <KpiStrip
        items={[
          { label: 'Open cases', value: 12, hint: '+3 this week' },
          { label: 'Resolved', value: '98%', tone: 'success' },
        ]}
      />,
    )

    expect(screen.getByText('Open cases')).toBeDefined()
    expect(screen.getByText('+3 this week')).toBeDefined()
    expect(screen.getByText('12').className).toContain('tabular-nums')
    expect(screen.getByText('98%').className).toContain('tabular-nums')
  })
})
