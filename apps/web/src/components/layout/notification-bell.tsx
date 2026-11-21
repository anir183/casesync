import { NOTIFICATION_TYPE } from '@casesync/config'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Select } from '#/components/ui/select'
import type { AppNotification } from '#/features/notifications/api'
import { groupNotificationsByType } from '#/features/notifications/groups'
import { notificationHref, notificationTypeLabel } from '#/features/notifications/links'
import { cn, formatDate } from '#/lib/utils'
import { NavDropdown } from './nav-dropdown'

interface NotificationBellProps {
  items: AppNotification[]
  unreadCount: number
  onOpenNotification?: (id: string) => void
  onMarkAllRead?: () => void
  isMarkingAllRead?: boolean
}

interface NotificationPanelProps {
  items: AppNotification[]
  unreadCount: number
  onOpenNotification?: (id: string) => void
  onMarkAllRead?: () => void
  isMarkingAllRead?: boolean
  close: () => void
}

const TYPE_OPTIONS = Object.values(NOTIFICATION_TYPE)

/**
 * The preview groups the newest notifications by type and supports quick
 * filtering without navigating away. All data comes from the shell's existing
 * query so this component stays presentation-only.
 */
function NotificationPanel({
  items,
  unreadCount,
  onOpenNotification,
  onMarkAllRead,
  isMarkingAllRead,
  close,
}: NotificationPanelProps) {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [type, setType] = useState('')

  const visible = items
    .filter((item) => !unreadOnly || !item.readAt)
    .filter((item) => !type || item.type === type)
    .slice(0, 8)
  const groups = groupNotificationsByType(visible)

  return (
    <div>
      <div className="space-y-2 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-body font-semibold">Notifications</p>
            <p className="text-meta text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </p>
          </div>
          {onMarkAllRead && unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onMarkAllRead}
              disabled={isMarkingAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={unreadOnly ? 'default' : 'outline'}
              onClick={() => setUnreadOnly((current) => !current)}
            >
              Unread only
            </Button>
            <Select
              aria-label="Notification type"
              className="h-8 w-auto min-w-36 text-meta"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">All types</option>
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {notificationTypeLabel(option)}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="px-4 py-8 text-center text-body text-muted-foreground">
          {items.length === 0 ? 'No notifications yet.' : 'No notifications match these filters.'}
        </p>
      ) : (
        <div className="max-h-96 divide-y divide-border overflow-y-auto">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h3 className="bg-muted/50 px-4 py-1.5 text-meta font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h3>
              <ul>
                {group.items.map((item) => {
                  const href = notificationHref(item) ?? '/notifications'
                  const unread = !item.readAt
                  return (
                    <li key={item.id}>
                      <Link
                        to={href}
                        onClick={() => {
                          if (unread) onOpenNotification?.(item.id)
                          close()
                        }}
                        className={cn(
                          'block px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                          unread && 'bg-primary/[0.04]',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            aria-hidden
                            className={cn(
                              'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                              unread ? 'bg-primary' : 'bg-transparent',
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'truncate text-body',
                                unread ? 'font-medium' : 'text-muted-foreground',
                              )}
                            >
                              {item.title ?? 'Notification'}
                            </p>
                            {item.message && (
                              <p className="mt-0.5 line-clamp-2 text-meta text-muted-foreground">
                                {item.message}
                              </p>
                            )}
                            <p className="mt-1 text-meta text-muted-foreground">
                              {formatDate(item.createdAt)}
                            </p>
                          </div>
                          {unread && <Badge variant="muted">New</Badge>}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="border-t border-border p-2">
        <Link
          to="/notifications"
          onClick={close}
          className="block rounded-lg px-3 py-2.5 text-center text-body font-medium text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View all notifications
        </Link>
      </div>
    </div>
  )
}

/**
 * The single unread indicator in the staff shell. The panel groups recent
 * notifications by type and filters them without leaving the shell.
 */
export function NotificationBell({
  items,
  unreadCount,
  onOpenNotification,
  onMarkAllRead,
  isMarkingAllRead = false,
}: NotificationBellProps) {
  const badge = unreadCount > 99 ? '99+' : String(unreadCount)
  const label = unreadCount > 0 ? `Notifications, ${badge} unread` : 'Notifications'

  return (
    <NavDropdown
      ariaLabel={label}
      align="right"
      panelLabel="Notification preview"
      panelClassName="w-[min(28rem,calc(100vw-2rem))] p-0"
      triggerClassName="relative h-9 w-9 justify-center px-0"
      label={
        <>
          <Bell aria-hidden className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-meta font-semibold text-danger-foreground">
              {badge}
            </span>
          )}
        </>
      }
    >
      {(close) => (
        <NotificationPanel
          items={items}
          unreadCount={unreadCount}
          onOpenNotification={onOpenNotification}
          onMarkAllRead={onMarkAllRead}
          isMarkingAllRead={isMarkingAllRead}
          close={close}
        />
      )}
    </NavDropdown>
  )
}
