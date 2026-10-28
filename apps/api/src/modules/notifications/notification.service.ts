import { AppError, HTTP_STATUS } from '#/lib/errors'
import { Notification } from '#/models/notification.model'

const LIST_LIMIT = 100

function toNotificationDto(item: {
  _id: unknown
  type: string
  referenceId?: string
  title?: string
  message?: string
  readAt?: Date
  createdAt: Date
}) {
  return {
    id: String(item._id),
    type: item.type,
    referenceId: item.referenceId,
    title: item.title,
    message: item.message,
    readAt: item.readAt,
    createdAt: item.createdAt,
  }
}

export async function listNotifications(recipientId: string, unreadOnly = false) {
  const filter: Record<string, unknown> = { recipientId }
  if (unreadOnly) filter.readAt = { $exists: false }

  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean(),
    Notification.countDocuments({ recipientId, readAt: { $exists: false } }),
  ])

  return { items: items.map(toNotificationDto), unreadCount }
}

export async function markNotificationRead(id: string, recipientId: string) {
  const item = await Notification.findOneAndUpdate(
    { _id: id, recipientId },
    { readAt: new Date() },
    { new: true },
  ).lean()
  if (!item) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Notification not found', 'NOTIFICATION_NOT_FOUND')
  }
  return toNotificationDto(item)
}

export async function markAllNotificationsRead(recipientId: string) {
  const result = await Notification.updateMany(
    { recipientId, readAt: { $exists: false } },
    { readAt: new Date() },
  )
  return { updated: result.modifiedCount }
}
