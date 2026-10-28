import mongoose from 'mongoose'
import { logger } from '#/lib/logger'
import { Notification } from '#/models/notification.model'

interface NotifyInput {
  type: string
  referenceId?: string
  title?: string
  message?: string
}

const USER_COLLECTION = 'user'

export async function notifyRoles(roles: string[], input: NotifyInput): Promise<number> {
  const db = mongoose.connection.db
  if (!db) {
    logger.warn('skipping notifications because the database is not connected')
    return 0
  }

  const users = await db
    .collection(USER_COLLECTION)
    .find({ role: { $in: roles }, active: { $ne: false } }, { projection: { _id: 1 } })
    .toArray()

  if (users.length === 0) return 0

  await Notification.insertMany(
    users.map((user) => ({
      recipientId: String(user._id),
      ...input,
    })),
  )
  return users.length
}
