import { NOTIFICATION_TYPE, PAGINATION } from '@casesync/config'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Select } from '#/components/ui/select'
import { formatDate } from '#/lib/utils'
import {
  type NotificationFilters,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../api'

const TYPE_OPTIONS = Object.values(NOTIFICATION_TYPE)
const DEFAULT_FILTERS: NotificationFilters = {
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
}

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
  const [filters, setFilters] = useState<NotificationFilters>(DEFAULT_FILTERS)
  const { data, isLoading, isError, error } = useNotifications(filters)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const items = data?.items ?? []

  function updateFilter(key: keyof NotificationFilters, value: string | undefined) {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      page: PAGINATION.DEFAULT_PAGE,
    }))
  }

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

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <Select
            aria-label="Notification type"
            value={filters.type ?? ''}
            onChange={(event) => updateFilter('type', event.target.value)}
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {typeLabel(type)}
              </option>
            ))}
          </Select>
          <Button
            variant={filters.unread === 'true' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('unread', filters.unread === 'true' ? undefined : 'true')}
          >
            Unread only
          </Button>
          <span className="text-sm text-muted-foreground">
            {data?.total ?? 0} matching notification{data?.total === 1 ? '' : 's'}
          </span>
        </CardContent>
      </Card>

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

      {data && data.total > 0 && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
          onPageSizeChange={(pageSize) =>
            setFilters((current) => ({
              ...current,
              pageSize,
              page: PAGINATION.DEFAULT_PAGE,
            }))
          }
        />
      )}
    </div>
  )
}
