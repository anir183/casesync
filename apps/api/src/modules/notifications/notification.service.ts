import { AppError, HTTP_STATUS } from '#/lib/errors'
import { buildPage, resolvePageQuery } from '#/lib/pagination'
import { Notification } from '#/models/notification.model'

export interface NotificationListQuery {
  unread?: string
  type?: string
  page?: string
  pageSize?: string
}

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

export async function listNotifications(recipientId: string, query: NotificationListQuery = {}) {
  const paging = resolvePageQuery(query)
  const filter: Record<string, unknown> = { recipientId }
  if (query.unread === 'true') filter.readAt = { $exists: false }
  if (query.type) filter.type = query.type

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipientId, readAt: { $exists: false } }),
  ])

  return {
    ...buildPage(items.map(toNotificationDto), total, paging),
    unreadCount,
  }
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
