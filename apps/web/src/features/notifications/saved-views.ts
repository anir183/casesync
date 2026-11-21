import { NOTIFICATION_TYPE } from '@casesync/config'
import type { NotificationFilters } from './api'

export interface NotificationSavedView {
  id: string
  label: string
  filters: Pick<NotificationFilters, 'unread' | 'type'>
}

export const NOTIFICATION_SAVED_VIEWS: NotificationSavedView[] = [
  { id: 'all', label: 'All notifications', filters: {} },
  { id: 'unread', label: 'Unread', filters: { unread: 'true' } },
  {
    id: 'overlap-alerts',
    label: 'Overlap alerts',
    filters: { type: NOTIFICATION_TYPE.OVERLAP_ALERT },
  },
  { id: 'escalations', label: 'Escalations', filters: { type: NOTIFICATION_TYPE.ESCALATION } },
]

export const NOTIFICATION_CUSTOM_VIEW: NotificationSavedView = {
  id: 'custom',
  label: 'Custom filters',
  filters: {},
}

function signature(filters: Pick<NotificationFilters, 'unread' | 'type'>) {
  return `${filters.unread ?? ''}|${filters.type ?? ''}`
}

export function notificationViewForFilters(filters: NotificationFilters): string {
  const current = signature(filters)
  return (
    NOTIFICATION_SAVED_VIEWS.find((view) => signature(view.filters) === current)?.id ??
    NOTIFICATION_CUSTOM_VIEW.id
  )
}
