import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ConfirmDialog, ConfirmSummary } from '../src/components/shared/confirm-dialog'

afterEach(cleanup)

describe('ConfirmDialog', () => {
  test('requires an explicit confirm or cancel choice', () => {
    let confirmed = 0
    let cancelled = 0
    render(
      <ConfirmDialog
        open
        title="Transfer this case?"
        description="The handover will be recorded."
        confirmLabel="Transfer case"
        onConfirm={() => {
          confirmed += 1
        }}
        onCancel={() => {
          cancelled += 1
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Transfer this case?' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Transfer case' }))

    expect(cancelled).toBe(1)
    expect(confirmed).toBe(1)
  })

  test('disables both actions while saving', () => {
    render(
      <ConfirmDialog
        open
        title="Dispose this case?"
        description="This cannot be undone."
        confirmLabel="Dispose case"
        destructive
        pending
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect((screen.getByRole('button', { name: 'Saving...' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })

  test('renders an optional change summary without changing the default dialog', () => {
    const props = {
      open: true,
      title: "Reset this user's password?",
      description: "Reset this user's password and revoke active sessions?",
      confirmLabel: 'Reset password',
    }
    const { rerender } = render(
      <ConfirmDialog {...props} onConfirm={() => {}} onCancel={() => {}} />,
    )

    expect(screen.queryByText('Account')).toBeNull()
    expect(screen.getByRole('heading', { name: props.title })).toBeDefined()
    expect(screen.getByText(props.description)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeDefined()

    rerender(
      <ConfirmDialog
        {...props}
        summary={
          <ConfirmSummary
            entries={[
              { label: 'Account', value: 'Ada Lovelace · ada@example.edu' },
              { label: 'Sessions', value: 'Active sessions revoked' },
            ]}
          />
        }
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByText('Account')).toBeDefined()
    expect(screen.getByText('Ada Lovelace · ada@example.edu')).toBeDefined()
    expect(screen.getByText('Sessions')).toBeDefined()
    expect(screen.getByText('Active sessions revoked')).toBeDefined()
    expect(screen.getByRole('heading', { name: props.title })).toBeDefined()
    expect(screen.getByText(props.description)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeDefined()
  })

  test('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Hidden"
        description="Hidden"
        confirmLabel="Confirm"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(container.textContent).toBe('')
  })
})
