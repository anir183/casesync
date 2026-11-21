import { NOTIFICATION_TYPE } from '@casesync/config'
import type { FormEvent } from 'react'
import { Button } from '#/components/ui/button'
import { FilterBar } from '#/components/ui/filter-bar'
import { SavedViewMenu } from '#/components/ui/saved-view-menu'
import { Select } from '#/components/ui/select'
import type { NotificationFilters } from '#/features/notifications/api'
import { notificationTypeLabel } from '#/features/notifications/links'
import {
  NOTIFICATION_CUSTOM_VIEW,
  NOTIFICATION_SAVED_VIEWS,
} from '#/features/notifications/saved-views'

const TYPE_OPTIONS = Object.values(NOTIFICATION_TYPE)

export interface NotificationTriageToolbarProps {
  filters: NotificationFilters
  activeView: string
  total: number
  unreadCount: number
  hasFilters: boolean
  onSavedViewChange: (id: string) => void
  onFilterChange: (key: 'unread' | 'type', value: string | undefined) => void
  onClearFilters: () => void
}

export function NotificationTriageToolbar({
  filters,
  activeView,
  total,
  unreadCount,
  hasFilters,
  onSavedViewChange,
  onFilterChange,
  onClearFilters,
}: NotificationTriageToolbarProps) {
  function preventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <section
      aria-label="Notification triage"
      className="sticky top-16 z-30 scroll-mt-32 border-b border-border bg-background/95 backdrop-blur"
    >
      <div className="space-y-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-meta text-muted-foreground" aria-live="polite">
            {total} matching notification{total === 1 ? '' : 's'} · {unreadCount} unread across all
            views
          </p>
          <p className="text-compact text-muted-foreground">Grouped by type on this page</p>
        </div>

        <SavedViewMenu
          views={[NOTIFICATION_CUSTOM_VIEW, ...NOTIFICATION_SAVED_VIEWS]}
          value={activeView}
          onChange={onSavedViewChange}
        />

        <FilterBar
          ariaLabel="Notification filters"
          onSubmit={preventSubmit}
          actions={
            hasFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        >
          <Select
            aria-label="Notification type"
            className="w-full sm:w-56"
            value={filters.type ?? ''}
            onChange={(event) => onFilterChange('type', event.target.value)}
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {notificationTypeLabel(type)}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant={filters.unread === 'true' ? 'default' : 'outline'}
            size="sm"
            aria-pressed={filters.unread === 'true'}
            onClick={() => onFilterChange('unread', filters.unread === 'true' ? undefined : 'true')}
          >
            Unread only
          </Button>
        </FilterBar>
      </div>
    </section>
  )
}
