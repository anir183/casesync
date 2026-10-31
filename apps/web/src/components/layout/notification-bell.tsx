import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import type { AppNotification } from '#/features/notifications/api'
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

/**
 * The single unread indicator in the staff and portal bars. The preview shows
 * the five newest notifications and always links to the full centre.
 */
export function NotificationBell({
  items,
  unreadCount,
  onOpenNotification,
  onMarkAllRead,
  isMarkingAllRead = false,
}: NotificationBellProps) {
  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
  const preview = items.slice(0, 5)

  return (
    <NavDropdown
      ariaLabel={label}
      align="right"
      panelLabel="Notification preview"
      panelClassName="w-[min(22rem,calc(100vw-2rem))] p-0"
      triggerClassName="relative h-9 w-9 justify-center px-0"
      label={
        <>
          <Bell aria-hidden className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </>
      }
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
              </p>
            </div>
            {onMarkAllRead && unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={isMarkingAllRead}
                className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {preview.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {preview.map((item) => {
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
                      className="block px-3 py-2.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
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
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                'truncate text-sm',
                                unread ? 'font-medium' : 'text-muted-foreground',
                              )}
                            >
                              {item.title ?? 'Notification'}
                            </p>
                            <Badge variant="muted" className="shrink-0">
                              {notificationTypeLabel(item.type)}
                            </Badge>
                          </div>
                          {item.message && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {item.message}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t border-border p-1.5">
            <Link
              to="/notifications"
              onClick={close}
              className="block rounded-lg px-2.5 py-2 text-center text-sm font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </NavDropdown>
  )
}
