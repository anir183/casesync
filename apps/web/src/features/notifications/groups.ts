import type { AppNotification } from './api'
import { notificationTypeLabel } from './links'

export interface NotificationGroup {
  label: string
  items: AppNotification[]
}

/** Group the loaded page by type while preserving the server's newest-first order. */
export function groupNotificationsByType(items: AppNotification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = []
  for (const item of items) {
    const label = notificationTypeLabel(item.type)
    const group = groups.find((entry) => entry.label === label)
    if (group) group.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}
