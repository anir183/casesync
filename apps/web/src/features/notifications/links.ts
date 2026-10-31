import { NOTIFICATION_TYPE } from '@casesync/config'
import type { AppNotification } from './api'

export function notificationHref(
  item: Pick<AppNotification, 'type' | 'referenceId' | 'link'>,
): string | undefined {
  if (item.link) return item.link
  if (!item.referenceId) return undefined
  if (item.type === NOTIFICATION_TYPE.OVERLAP_ALERT) return `/overlaps/${item.referenceId}`
  return `/cases/${item.referenceId}`
}

export function notificationTypeLabel(type: string) {
  return type.replace(/_/g, ' ').toLowerCase()
}
