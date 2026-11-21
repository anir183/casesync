import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AppNotification, NotificationFilters } from '../src/features/notifications/api'
import { NotificationGroupCard } from '../src/features/notifications/components/notification-group'
import { NotificationTriageToolbar } from '../src/features/notifications/components/notification-triage-toolbar'
import { groupNotificationsByType } from '../src/features/notifications/groups'
import { notificationViewForFilters } from '../src/features/notifications/saved-views'

afterEach(cleanup)

function notification(index: number, overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: `notification-${index}`,
    type: 'OVERLAP_ALERT',
    referenceId: `case-${index}`,
    title: `Alert ${index}`,
    message: `Message ${index}`,
    createdAt: `2026-11-${String(index).padStart(2, '0')}T10:00:00.000Z`,
    ...overrides,
  }
}

describe('notification triage toolbar', () => {
  test('keeps saved views and filters in a named sticky region', () => {
    const onSavedViewChange = mock((_id: string) => {})
    const onFilterChange = mock((_key: 'unread' | 'type', _value: string | undefined) => {})
    const onClearFilters = mock(() => {})
    const filters: NotificationFilters = { page: 1, pageSize: 20, type: 'OVERLAP_ALERT' }

    render(
      <NotificationTriageToolbar
        filters={filters}
        activeView="overlap-alerts"
        total={3}
        unreadCount={2}
        hasFilters
        onSavedViewChange={onSavedViewChange}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
      />,
    )

    expect(screen.getByRole('region', { name: 'Notification triage' })).toBeDefined()
    expect(screen.getByRole('combobox', { name: 'Saved views' })).toBeDefined()
    expect(screen.getByRole('search', { name: 'Notification filters' })).toBeDefined()
    expect(screen.getByText('3 matching notifications · 2 unread across all views')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Unread only' }).getAttribute('aria-pressed')).toBe(
      'false',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Unread only' }))
    expect(onFilterChange).toHaveBeenCalledWith('unread', 'true')

    fireEvent.change(screen.getByLabelText('Notification type'), { target: { value: '' } })
    expect(onFilterChange).toHaveBeenCalledWith('type', '')

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClearFilters).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByRole('combobox', { name: 'Saved views' }), {
      target: { value: 'unread' },
    })
    expect(onSavedViewChange).toHaveBeenCalledWith('unread')
  })

  test('exposes the unread filter as a pressed state', () => {
    render(
      <NotificationTriageToolbar
        filters={{ unread: 'true' }}
        activeView="unread"
        total={0}
        unreadCount={0}
        hasFilters
        onSavedViewChange={() => {}}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Unread only' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })
})

describe('notification group card', () => {
  test('groups by type and makes unread state explicit without hiding actions', () => {
    const onMarkRead = mock((_id: string) => {})
    const groups = groupNotificationsByType([
      notification(1),
      notification(2, { readAt: '2026-11-21T10:00:00.000Z' }),
    ])

    render(
      <MemoryRouter>
        <NotificationGroupCard
          group={groups[0] as ReturnType<typeof groupNotificationsByType>[number]}
          isMarkingRead={false}
          onMarkRead={onMarkRead}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'overlap alert' })).toBeDefined()
    expect(screen.getByText('Unread')).toBeDefined()
    expect(screen.getAllByRole('link', { name: 'Open record' })).toHaveLength(2)

    const markRead = screen.getByRole('button', { name: 'Mark as read' })
    expect(markRead.className).not.toContain('sm:opacity-0')
    fireEvent.click(markRead)
    expect(onMarkRead).toHaveBeenCalledWith('notification-1')
  })

  test('does not offer a read cue or decision for already-read rows', () => {
    render(
      <MemoryRouter>
        <NotificationGroupCard
          group={{
            label: 'escalation',
            items: [
              notification(3, {
                type: 'ESCALATION',
                readAt: '2026-11-21T10:00:00.000Z',
              }),
            ],
          }}
          isMarkingRead={false}
          onMarkRead={() => {}}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Unread')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mark as read' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Open record' }).getAttribute('href')).toBe(
      '/cases/case-3',
    )
  })
})

describe('notification saved views', () => {
  test('maps exact server filters to saved or custom views', () => {
    expect(notificationViewForFilters({})).toBe('all')
    expect(notificationViewForFilters({ unread: 'true' })).toBe('unread')
    expect(notificationViewForFilters({ type: 'OVERLAP_ALERT' })).toBe('overlap-alerts')
    expect(notificationViewForFilters({ type: 'ESCALATION' })).toBe('escalations')
    expect(notificationViewForFilters({ unread: 'true', type: 'OVERLAP_ALERT', page: 2 })).toBe(
      'custom',
    )
  })
})
