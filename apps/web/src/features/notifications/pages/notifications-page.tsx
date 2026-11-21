import { PAGINATION } from '@casesync/config'
import { useState } from 'react'
import { EmptyState } from '#/components/shared/empty-state'
import { PageHeader } from '#/components/shared/page-header'
import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import {
  type NotificationFilters,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '#/features/notifications/api'
import { NotificationGroupCard } from '#/features/notifications/components/notification-group'
import { NotificationTriageToolbar } from '#/features/notifications/components/notification-triage-toolbar'
import { groupNotificationsByType } from '#/features/notifications/groups'
import {
  NOTIFICATION_SAVED_VIEWS,
  notificationViewForFilters,
} from '#/features/notifications/saved-views'

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
  const groups = groupNotificationsByType(items)
  const hasFilters = Boolean(filters.type || filters.unread)
  const activeView = notificationViewForFilters(filters)

  function updateFilter(key: 'unread' | 'type', value: string | undefined) {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      page: PAGINATION.DEFAULT_PAGE,
    }))
  }

  function applySavedView(id: string) {
    const view = NOTIFICATION_SAVED_VIEWS.find((entry) => entry.id === id)
    if (!view) return
    setFilters((current) => ({
      page: PAGINATION.DEFAULT_PAGE,
      pageSize: current.pageSize,
      unread: view.filters.unread,
      type: view.filters.type,
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

      <NotificationTriageToolbar
        filters={filters}
        activeView={activeView}
        total={data?.total ?? 0}
        unreadCount={data?.unreadCount ?? 0}
        hasFilters={hasFilters}
        onSavedViewChange={applySavedView}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
      />

      {isError ? (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
          {error instanceof Error ? error.message : 'Unable to load notifications'}
        </div>
      ) : null}

      {isLoading ? (
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
      ) : null}

      {!isLoading && !isError && items.length === 0 ? (
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
      ) : null}

      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <NotificationGroupCard
              key={group.label}
              group={group}
              isMarkingRead={markRead.isPending}
              onMarkRead={(id) => markRead.mutate(id)}
            />
          ))}
        </div>
      ) : null}

      {data && data.total > 0 ? (
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
      ) : null}
    </div>
  )
}
