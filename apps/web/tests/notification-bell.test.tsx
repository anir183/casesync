import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotificationBell } from '../src/components/layout/notification-bell'
import type { AppNotification } from '../src/features/notifications/api'

afterEach(cleanup)

function notification(index: number, overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: `notification-${index}`,
    type: 'OVERLAP_ALERT',
    referenceId: `case-${index}`,
    title: `Alert ${index}`,
    message: `Message ${index}`,
    createdAt: `2026-10-${String(index).padStart(2, '0')}T10:00:00.000Z`,
    ...overrides,
  }
}

function renderBell(
  items: AppNotification[],
  unreadCount = items.filter((item) => !item.readAt).length,
  onMarkAllRead?: () => void,
  onOpenNotification?: (id: string) => void,
) {
  return render(
    <MemoryRouter>
      <NotificationBell
        items={items}
        unreadCount={unreadCount}
        onMarkAllRead={onMarkAllRead}
        onOpenNotification={onOpenNotification}
      />
    </MemoryRouter>,
  )
}

describe('notification bell', () => {
  test('is the unread indicator and shows the eight newest items', () => {
    renderBell(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => notification(index)),
      2,
    )

    const trigger = screen.getByRole('button', { name: 'Notifications, 2 unread' })
    fireEvent.click(trigger)

    expect(screen.getByText('Alert 8')).toBeDefined()
    expect(screen.queryByText('Alert 9')).toBeNull()
    expect(screen.getByRole('link', { name: 'View all notifications' })).toBeDefined()
  })

  test('marks all notifications read without closing the preview', () => {
    let marked = 0
    renderBell([notification(1), notification(2)], 2, () => {
      marked += 1
    })

    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 2 unread' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }))

    expect(marked).toBe(1)
    expect(screen.getByRole('link', { name: 'View all notifications' })).toBeDefined()
  })

  test('marks an unread item when its preview link is opened', () => {
    const opened: string[] = []
    renderBell([notification(1)], 1, undefined, (id) => opened.push(id))

    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }))
    fireEvent.click(screen.getByRole('link', { name: /Alert 1/ }))

    expect(opened).toEqual(['notification-1'])
  })

  test('closes on Escape and returns focus to the trigger', () => {
    renderBell([notification(1)])

    const trigger = screen.getByRole('button', { name: 'Notifications, 1 unread' })
    fireEvent.click(trigger)
    expect(screen.getByRole('link', { name: 'View all notifications' })).toBeDefined()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('link', { name: 'View all notifications' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  test('shows an empty state when there are no notifications', () => {
    renderBell([], 0)

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(screen.getByText('No notifications yet.')).toBeDefined()
    expect(screen.getByText('You are all caught up')).toBeDefined()
  })

  test('groups the preview by notification type', () => {
    renderBell([
      notification(1, { type: 'OVERLAP_ALERT' }),
      notification(2, { type: 'COMPLAINT_SUBMITTED' }),
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 2 unread' }))

    expect(screen.getByRole('heading', { name: 'overlap alert' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'complaint submitted' })).toBeDefined()
  })

  test('filters the preview by unread state and type', () => {
    renderBell([
      notification(1, { type: 'OVERLAP_ALERT' }),
      notification(2, { type: 'COMPLAINT_SUBMITTED', readAt: '2026-10-21T10:00:00.000Z' }),
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }))
    fireEvent.click(screen.getByRole('button', { name: 'Unread only' }))

    expect(screen.getByText('Alert 1')).toBeDefined()
    expect(screen.queryByText('Alert 2')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Unread only' }))
    const typeSelect = screen.getByLabelText('Notification type')
    fireEvent.change(typeSelect, { target: { value: 'COMPLAINT_SUBMITTED' } })

    expect(screen.getByText('Alert 2')).toBeDefined()
    expect(screen.queryByText('Alert 1')).toBeNull()
  })
})
