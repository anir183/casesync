import { NOTIFICATION_TYPE } from '@casesync/config'
import { Link } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { formatDate } from '#/lib/utils'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../api'

function referenceLink(type: string, referenceId?: string) {
  if (!referenceId) return undefined
  if (type === NOTIFICATION_TYPE.OVERLAP_ALERT) return `/overlaps/${referenceId}`
  if (type === NOTIFICATION_TYPE.ESCALATION) return `/cases/${referenceId}`
  return undefined
}

function typeLabel(type: string) {
  return type.replace(/_/g, ' ').toLowerCase()
}

export function NotificationsPage() {
  const { data, isLoading, isError, error } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Overlap alerts and escalation notices for your role.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={data?.unreadCount ? 'warning' : 'muted'}>
            {data?.unreadCount ?? 0} unread
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={!data?.unreadCount || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all as read
          </Button>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Unable to load notifications'}
        </p>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Loading notifications…</p>}
      {!isLoading && !isError && items.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const link = referenceLink(item.type, item.referenceId)
          const unread = !item.readAt
          return (
            <Card key={item.id} className={unread ? 'border-foreground/30' : undefined}>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {unread && <span className="h-2 w-2 rounded-full bg-foreground" />}
                    <span className="font-medium">{item.title ?? 'Notification'}</span>
                    <Badge variant="muted">{typeLabel(item.type)}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                {item.message && <p className="text-sm text-muted-foreground">{item.message}</p>}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {link && (
                    <Link to={link} className="underline underline-offset-4">
                      Open record
                    </Link>
                  )}
                  {unread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={markRead.isPending}
                      onClick={() => markRead.mutate(item.id)}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
