import { ROLES } from '@casesync/config'
import mongoose from 'mongoose'
import { logger } from '#/lib/logger'
import { Notification } from '#/models/notification.model'

interface NotifyInput {
  type: string
  referenceId?: string
  caseId?: string
  link?: string
  periodKey?: string
  title?: string
  message?: string
}

interface ScopedRecipientQuery {
  roles: readonly string[]
  bureauIds?: readonly string[]
  regionIds?: readonly string[]
}

const USER_COLLECTION = 'user'
const ACTIVE_USER_FILTER = { active: { $ne: false } }

function database() {
  const db = mongoose.connection.db
  if (!db) {
    logger.warn('skipping notifications because the database is not connected')
  }
  return db
}

function scopedUserFilter(query: ScopedRecipientQuery) {
  const clauses: Record<string, unknown>[] = []
  if (query.roles.length > 0) clauses.push({ role: { $in: query.roles } })
  if (query.bureauIds?.length) {
    clauses.push({ role: ROLES.BUREAU_OFFICER, bureauId: { $in: query.bureauIds } })
  }
  if (query.regionIds?.length) {
    clauses.push({ role: ROLES.REGIONAL_OFFICER, regionId: { $in: query.regionIds } })
  }
  if (clauses.length === 0) return null
  return { ...ACTIVE_USER_FILTER, $or: clauses }
}

async function findRecipientIds(filter: Record<string, unknown> | null): Promise<string[]> {
  if (!filter) return []
  const db = database()
  if (!db) return []
  const users = await db
    .collection(USER_COLLECTION)
    .find(filter, { projection: { _id: 1 } })
    .toArray()
  return users.map((user) => String(user._id))
}

async function insertOnce(recipientIds: string[], input: NotifyInput): Promise<number> {
  if (recipientIds.length === 0) return 0

  if (!input.periodKey) {
    const created = await Notification.insertMany(
      recipientIds.map((recipientId) => ({ recipientId, ...input })),
      { ordered: false },
    )
    return created.length
  }

  const now = new Date()
  const { caseId, ...fields } = input
  const result = await Notification.bulkWrite(
    recipientIds.map((recipientId) => ({
      updateOne: {
        filter: {
          recipientId,
          type: input.type,
          referenceId: input.referenceId,
          periodKey: input.periodKey,
        },
        update: {
          $setOnInsert: {
            recipientId,
            ...fields,
            ...(caseId ? { caseId: new mongoose.Types.ObjectId(caseId) } : {}),
            createdAt: now,
          },
        },
        upsert: true,
      },
    })),
  )
  return result.upsertedCount
}

export async function notifyRecipients(
  recipientIds: readonly string[],
  input: NotifyInput,
): Promise<number> {
  const uniqueIds = [...new Set(recipientIds)]
  if (uniqueIds.length === 0) return 0
  return insertOnce(uniqueIds, input)
}

export async function resolveScopedRecipients(query: ScopedRecipientQuery): Promise<string[]> {
  return findRecipientIds(scopedUserFilter(query))
}

export async function notifyRoles(roles: string[], input: NotifyInput): Promise<number> {
  const recipients = await findRecipientIds({
    ...ACTIVE_USER_FILTER,
    role: { $in: roles },
  })
  return notifyRecipients(recipients, input)
}
