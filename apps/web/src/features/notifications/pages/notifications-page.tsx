import { NOTIFICATION_TYPE, PAGINATION } from '@casesync/config'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '#/components/shared/empty-state'
import { PageHeader } from '#/components/shared/page-header'
import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardBody } from '#/components/ui/card'
import { Select } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { cn, formatDate } from '#/lib/utils'
import {
  type NotificationFilters,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../api'
import { notificationHref, notificationTypeLabel } from '../links'

const TYPE_OPTIONS = Object.values(NOTIFICATION_TYPE)
const DEFAULT_FILTERS: NotificationFilters = {
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
}

export function NotificationsPage() {
  const [filters, setFilters] = useState<NotificationFilters>(DEFAULT_FILTERS)
  const { data, isLoading, isError, error } = useNotifications(filters)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const items = data?.items ?? []
  const hasFilters = Boolean(filters.type || filters.unread)

  function updateFilter(key: keyof NotificationFilters, value: string | undefined) {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      page: PAGINATION.DEFAULT_PAGE,
    }))
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Overlap alerts, merge decisions, complaint updates, verification decisions, and escalation notices."
        actions={
          <>
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
          </>
        }
      />

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Notification type"
              className="w-full sm:w-56"
              value={filters.type ?? ''}
              onChange={(event) => updateFilter('type', event.target.value)}
            >
              <option value="">All types</option>
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {notificationTypeLabel(type)}
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
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {data?.total ?? 0} matching notification{data?.total === 1 ? '' : 's'}
          </span>
        </CardBody>
      </Card>

      {isError && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
          {error instanceof Error ? error.message : 'Unable to load notifications'}
        </div>
      )}

      {isLoading && (
        <Card>
          <div className="divide-y divide-border">
            {[0, 1, 2].map((row) => (
              <div key={row} className="space-y-2 px-5 py-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          title={hasFilters ? 'No matching notifications' : 'No notifications yet'}
          description={
            hasFilters
              ? 'Try a different type or turn off the unread filter.'
              : 'Alerts about overlaps, merges, complaints, and verifications will appear here.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}

      {items.length > 0 && (
        <Card>
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const link = notificationHref(item)
              const unread = !item.readAt
              return (
                <li
                  key={item.id}
                  className={cn(
                    'group px-5 py-4 transition-colors hover:bg-muted/40',
                    unread && 'bg-primary/[0.04]',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        unread ? 'bg-primary' : 'bg-transparent',
                      )}
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              'text-sm',
                              unread ? 'font-semibold text-foreground' : 'font-medium',
                            )}
                          >
                            {item.title ?? 'Notification'}
                          </p>
                          <Badge variant="muted">{notificationTypeLabel(item.type)}</Badge>
                        </div>
                        <time className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </time>
                      </div>
                      {item.message && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {item.message}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 pt-0.5 text-sm">
                        {link && (
                          <Link to={link} className="underline underline-offset-4">
                            Open record
                          </Link>
                        )}
                        {unread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                            disabled={markRead.isPending}
                            onClick={() => markRead.mutate(item.id)}
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

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
